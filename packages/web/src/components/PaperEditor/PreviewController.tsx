import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';
import showdown from 'showdown';
import mermaid from 'mermaid';
import katex from 'katex';
// @ts-ignore
import * as vega from 'vega';
// @ts-ignore
import * as vegaLite from 'vega-lite';
import { Previewer } from 'pagedjs';
import { ArrowGramStatic } from '../ArrowGramStatic';
import './styles.css';

// --- CONFIGURATION ---
const generatePageStyles = (metadata: any) => {
    const pageMargins: { [key: string]: string } = {
        'header-left': '@top-left', 'header-center': '@top-center', 'header-right': '@top-right',
        'footer-left': '@bottom-left', 'footer-center': '@bottom-center', 'footer-right': '@bottom-right',
    };

    const generateContentValue = (text: string) => {
        const replacements: { [key: string]: string } = {
            '[pageNumber]': 'counter(page)',
            '[totalPages]': 'counter(pages)',
            '[title]': `"${metadata.title || ''}"`,
            '[authors]': `"${metadata.authors || ''}"`,
        };
        // @ts-ignore
        const parts = text.split(/(\[pageNumber\]|\[totalPages\]|\[title\]|\[authors\])/g).filter(p => p);
        if (parts.length === 0) return '""';
        // @ts-ignore
        return parts.map(part => replacements[part] || `"${part.replace(/"/g, '\\"')}"`).join(' ');
    };

    let pageContentCss = '';
    for (const [key, selector] of Object.entries(pageMargins)) {
        if (metadata[key]) {
            const content = generateContentValue(metadata[key]);
            pageContentCss += `${selector} { content: ${content}; } `;
        }
    }

    return pageContentCss ? `@page { ${pageContentCss} }` : '';
};

interface PreviewControllerProps {
    markdown: string;
    isTwoColumn: boolean;
    onEditDiagram: (id: string, spec: string) => void;
}

export const PreviewController = ({ markdown, isTwoColumn, onEditDiagram }: PreviewControllerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pagedInstance = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        // Use a simple ID to track the latest render request
        const renderId = Date.now();
        // @ts-ignore
        containerRef.current._latestRenderId = renderId;

        const roots: any[] = [];

        const processAndRender = async () => {
            if (!containerRef.current) return;

            // 1. Pre-process Vega Lite
            let processedText = markdown;
            const vegaRegex = /<div class="vega-lite"([^>]*)>([\s\S]*?)<\/div>/g;
            const vegaMatches = Array.from(processedText.matchAll(vegaRegex));

            const vegaResults = await Promise.all(
                vegaMatches.map(async (match) => {
                    if (!isMounted) return { original: '', replacement: '' };
                    try {
                        const spec = JSON.parse(match[2].trim());
                        const vegaSpec = vegaLite.compile(spec).spec;
                        const view = new vega.View(vega.parse(vegaSpec), { renderer: 'svg' });
                        const svg = await view.toSVG();
                        return { original: match[0], replacement: `<div class="vega-container"${match[1]}>${svg}</div>` };
                    } catch (e: any) {
                        return { original: match[0], replacement: `<div class="vega-error">Chart Error: ${e.message}</div>` };
                    }
                })
            );

            // Check staleness after async work
            // @ts-ignore
            if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

            for (const result of vegaResults) {
                if (result.original) processedText = processedText.replace(result.original, result.replacement);
            }

            // 2. Pre-process Mermaid
            mermaid.initialize({ startOnLoad: false, theme: 'base' });
            const mermaidRegex = /<div class="mermaid"([^>]*)>([\s\S]*?)<\/div>/g;
            const mermaidMatches = Array.from(processedText.matchAll(mermaidRegex));
            const mermaidResults = await Promise.all(
                mermaidMatches.map(async (match, i) => {
                    if (!isMounted) return { original: '', replacement: '' };
                    try {
                        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}-${i}`, match[2].trim());
                        return { original: match[0], replacement: `<div class="mermaid-container"${match[1]}>${svg}</div>` };
                    } catch (e) { return { original: match[0], replacement: `<div class="mermaid-error">Diagram Error</div>` }; }
                })
            );

            // Check staleness after async work
            // @ts-ignore
            if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

            for (const result of mermaidResults) {
                if (result.original) processedText = processedText.replace(result.original, result.replacement);
            }

            // 3. Pre-process ArrowGram Placeholders
            const arrowgramRegex = /<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g;
            const arrowgrams: { id: string, spec: string }[] = [];
            let agCounter = 0;

            processedText = processedText.replace(arrowgramRegex, (match, attrs, content) => {
                const id = `arrowgram-hydrate-${Date.now()}-${agCounter++}`;
                const spec = content.trim();
                arrowgrams.push({ id, spec });

                try {
                    // Render the static SVG markup to ensure Paged.js sees the correct dimensions.
                    // onEdit is undefined here, so no button, but sizing is correct.
                    const staticHtml = ReactDOMServer.renderToStaticMarkup(
                        <ArrowGramStatic spec={spec} />
                    );
                    return `<div id="${id}" class="arrowgram-hydrate-target">${staticHtml}</div>`;
                } catch (e: any) {
                    console.error("Static Render Error:", e);
                    return `<div id="${id}" class="arrowgram-hydrate-target" style="min-height: 100px; border: 1px solid red;">Error rendering diagram</div>`;
                }
            });

            // 4. Protect raw LaTeX blocks from the Markdown parser.
            // Showdown may interpret underscores inside `$...$` / `$$...$$` as emphasis, producing `<em>` tags
            // and breaking KaTeX input. We replace math blocks with placeholders before Markdown,
            // then restore them right after conversion.
            const protectedMathBlocks = new Map<string, string>();
            let mathPlaceholderId = 0;
            const protectMath = (block: string) => {
                // Avoid `_` in placeholders: Markdown may interpret underscores as emphasis and mutate them.
                const placeholder = `AGPROTMATH${mathPlaceholderId++}AGPROT`;
                protectedMathBlocks.set(placeholder, block);
                return placeholder;
            };

            // Protect display math first (can span lines).
            processedText = processedText.replace(/\$\$[\s\S]+?\$\$/g, protectMath);
            // Protect inline math (keep it on one line, avoid $$...$$).
            processedText = processedText.replace(/\$(?!\$)(?:\\.|[^$\\\n])+\$/g, protectMath);

            // 5. Markdown -> HTML
            const converter = new showdown.Converter({
                metadata: true,
                noHeaderId: true,
                literalMidWordUnderscores: true
            });
            let html = converter.makeHtml(processedText);
            const metadata = converter.getMetadata() as any;

            const pageStylesCss = generatePageStyles(metadata);

            // Restore protected LaTeX blocks (so the KaTeX pass can see $$...$$ again).
            for (const [placeholder, originalBlock] of protectedMathBlocks.entries()) {
                html = html.split(placeholder).join(originalBlock);
            }

            // 6. Katex
            const protectedBlocks = new Map();
            html = html.replace(/<(pre|code)[^>]*>[\s\S]*?<\/\1>/g, (match: string) => {
                const placeholder = `%%PROTECTED_BLOCK_${protectedBlocks.size}%%`;
                protectedBlocks.set(placeholder, match);
                return placeholder;
            });

            // Process LaTeX math on the "unprotected" HTML.
            // Display mode: $$...$$
            html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
                const cleaned = latex
                    .trim()
                    .replace(/\\\\([A-Za-z_])/g, '\\$1')
                    .replace(/\\\\([,;:.!])/g, '\\$1');
                try {
                    return `<span class="katex-display">${katex.renderToString(cleaned, { displayMode: true, throwOnError: false })}</span>`;
                } catch (e: any) { return `<span class="katex-error">${e.message}</span>`; }
            });
            // Inline mode: $...$ (non-greedy)
            html = html.replace(/\$([^$]+?)\$/g, (_match, latex) => {
                const cleaned = latex
                    .trim()
                    .replace(/\\\\([A-Za-z_])/g, '\\$1')
                    .replace(/\\\\([,;:.!])/g, '\\$1');
                try {
                    return katex.renderToString(cleaned, { displayMode: false, throwOnError: false });
                } catch (e: any) { return `<span class="katex-error">${e.message}</span>`; }
            });

            for (const [placeholder, originalBlock] of protectedBlocks.entries()) {
                html = html.replace(placeholder, originalBlock);
            }

            // 6. Final Layout Wrapper
            const titleBlockHtml = `<div class="title-block">${metadata.title ? `<div class="title">${metadata.title}</div>` : ''}${metadata.authors ? `<div class="authors">${metadata.authors}</div>` : ''}</div>`;
            const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
            const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${html}</div></div>`;

            // 7. Render with Paged.js
            if (containerRef.current) {
                // Check staleness before starting Paged.js
                // @ts-ignore
                if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

                containerRef.current.innerHTML = '';

                const stylesheets = [];
                if (pageStylesCss) {
                    const base64Css = btoa(unescape(encodeURIComponent(pageStylesCss)));
                    const dataUri = `data:text/css;base64,${base64Css}`;
                    stylesheets.push(dataUri);
                }
                const katexCss = document.querySelector('link[href*="katex"]')?.getAttribute('href') || "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
                stylesheets.push(katexCss);

                const paged = new Previewer();
                pagedInstance.current = paged;

                paged.preview(finalHtml, stylesheets, containerRef.current).then(() => {
                    // Final check before hydration
                    // @ts-ignore
                    if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

                    // 8. Hydrate ArrowGram Components
                    arrowgrams.forEach(({ id, spec }) => {
                        const el = containerRef.current?.querySelector(`#${id}`);
                        if (el) {
                            const root = createRoot(el);
                            roots.push(root);
                            root.render(
                                <ArrowGramStatic
                                    spec={spec}
                                    onEdit={() => onEditDiagram(id, spec)}
                                />
                            );
                        }
                    });
                });
            }
        };

        processAndRender();

        return () => {
            isMounted = false;
            roots.forEach(r => r.unmount());
        };
    }, [markdown, isTwoColumn, onEditDiagram]);

    return (
        <div ref={containerRef} className="preview-content-area" />
    );
};
