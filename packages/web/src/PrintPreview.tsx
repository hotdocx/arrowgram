import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import showdown from 'showdown';
import mermaid from 'mermaid';
import katex from 'katex';
// @ts-ignore
import * as vega from 'vega';
// @ts-ignore
import * as vegaLite from 'vega-lite';
import { Previewer } from 'pagedjs';
import { ArrowGramStatic } from './components/ArrowGramStatic';
import './print-styles.css';

interface PreviewControllerProps {
    markdown: string;
    isTwoColumn: boolean;
}

const PreviewController = ({ markdown, isTwoColumn }: PreviewControllerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;
        const processAndRender = async () => {
            let processedText = markdown;

            // 1. Pre-process Vega-Lite charts directly to SVG strings
            const vegaRegex = /<div class="vega-lite"([^>]*)>([\s\S]*?)<\/div>/g;
            const vegaMatches = Array.from(processedText.matchAll(vegaRegex));
            const vegaResults = await Promise.all(
                vegaMatches.map(async (match) => {
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
            for (const result of vegaResults) { processedText = processedText.replace(result.original, result.replacement); }

            // 2. Pre-process Mermaid diagrams
            mermaid.initialize({ startOnLoad: false, theme: 'base' });
            const mermaidRegex = /<div class="mermaid"([^>]*)>([\s\S]*?)<\/div>/g;
            const mermaidMatches = Array.from(processedText.matchAll(mermaidRegex));
            const mermaidResults = await Promise.all(
                mermaidMatches.map(async (match, i) => {
                    try {
                        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}-${i}`, match[2].trim());
                        return { original: match[0], replacement: `<div class="mermaid-container"${match[1]}>${svg}</div>` };
                    } catch (e) { return { original: match[0], replacement: `<div class="mermaid-error">Diagram Error</div>` }; }
                })
            );
            for (const result of mermaidResults) { processedText = processedText.replace(result.original, result.replacement); }

            // 3. Pre-process Arrowgram diagrams
            const arrowgramRegex = /<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g;
            const arrowgramMatches = Array.from(processedText.matchAll(arrowgramRegex));
            const arrowgramResults = arrowgramMatches.map((match) => {
                try {
                    const spec = match[2].trim();
                    JSON.parse(spec); // Validate JSON
                    const svgString = ReactDOMServer.renderToStaticMarkup(<ArrowGramStatic spec={spec} />);
                    return { original: match[0], replacement: `<div class="arrowgram-container"${match[1]}>${svgString}</div>` };
                } catch (e: any) {
                    console.error("Arrowgram Error:", e);
                    return { original: match[0], replacement: `<div class="arrowgram-error">Diagram Error: ${e.message}</div>` };
                }
            });
            for (const result of arrowgramResults) { processedText = processedText.replace(result.original, result.replacement); }

            // 3. Protect raw LaTeX blocks from the Markdown parser.
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

            // 4. Convert Markdown to HTML with KaTeX-safe options
            const converter = new showdown.Converter({
                metadata: true,
                noHeaderId: true,
                literalMidWordUnderscores: true // *** The crucial fix for KaTeX ***
            });
            let html = converter.makeHtml(processedText);
            const metadata = converter.getMetadata() as any;

            // Restore protected LaTeX blocks (so the KaTeX pass can see $$...$$ again).
            for (const [placeholder, originalBlock] of protectedMathBlocks.entries()) {
                html = html.split(placeholder).join(originalBlock);
            }

            // 5. Process LaTeX math with KaTeX, correctly ignoring code blocks.
            const protectedBlocks = new Map();
            let placeholderId = 0;
            const protectBlock = (block: string) => {
                const placeholder = `AGPROTCODE${placeholderId++}AGPROT`;
                protectedBlocks.set(placeholder, block);
                return placeholder;
            };

            // Protect <pre> blocks first, then standalone <code> blocks.
            html = html.replace(/<pre[^>]*>.*?<\/pre>/gs, protectBlock);
            html = html.replace(/<code[^>]*>.*?<\/code>/gs, protectBlock);

            // Process LaTeX math on the "unprotected" HTML.
            // Display mode: $$...$$
            html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
                const cleaned = latex
                    .trim()
                    .replace(/\\\\([A-Za-z_])/g, '\\$1')
                    .replace(/\\\\([,;:.!])/g, '\\$1');
                return katex.renderToString(cleaned, { throwOnError: false, displayMode: true });
            });
            // Inline mode: $...$ (non-greedy)
            html = html.replace(/\$([^$]+?)\$/g, (_match, latex) => {
                const cleaned = latex
                    .trim()
                    .replace(/\\\\([A-Za-z_])/g, '\\$1')
                    .replace(/\\\\([,;:.!])/g, '\\$1');
                return katex.renderToString(cleaned, { throwOnError: false, displayMode: false });
            });

            // Restore the protected code blocks.
            for (const [placeholder, originalBlock] of protectedBlocks.entries()) {
                html = html.split(placeholder).join(originalBlock);
            }

            // 6. Assemble final HTML for Paged.js
            const titleBlockHtml = `<div class="title-block">${metadata.title ? `<div class="title">${metadata.title}</div>` : ''}${metadata.authors ? `<div class="authors">${metadata.authors}</div>` : ''}</div>`;
            const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
            const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${html}</div></div>`;

            if (isMounted && containerRef.current) {
                containerRef.current.innerHTML = '';
                const paged = new Previewer();
                // Pass KaTeX CSS but rely on imported print-styles.css for the rest
                // @ts-ignore
                paged.preview(finalHtml, ["https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"], containerRef.current);
            }
        };
        processAndRender();
        return () => { isMounted = false; };
    }, [markdown, isTwoColumn]);

    return (
        <div ref={containerRef} className="preview-content-area">
            <p className="loading-indicator">Processing Document...</p>
        </div>
    );
};

export default function PrintPreview() {
    const [markdown, setMarkdown] = useState<string | null>(null);
    const [isTwoColumn, setIsTwoColumn] = useState(false);

    useEffect(() => {
        // Load content passed from the editor via localStorage
        const storedMarkdown = localStorage.getItem('print_content');
        const storedLayout = localStorage.getItem('print_layout');
        
        if (storedMarkdown) {
            setMarkdown(storedMarkdown);
        } else {
            setMarkdown("# Error: No content found\n\nPlease close this window and try printing again.");
        }

        if (storedLayout) {
            setIsTwoColumn(storedLayout === 'true');
        }
    }, []);

    if (!markdown) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="preview-container">
            <div className="preview-controls">
                <button className="control-button" onClick={() => window.close()}>Close</button>
                <button className="control-button" onClick={() => window.print()}>Print</button>
            </div>
            <PreviewController markdown={markdown} isTwoColumn={isTwoColumn} />
        </div>
    );
}
