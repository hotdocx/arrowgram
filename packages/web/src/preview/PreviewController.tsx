import React, { useEffect, useRef } from 'react';
import { ArrowGramStatic } from '../components/ArrowGramStatic';
import '../print-styles.css';

export interface PreviewControllerProps {
    markdown: string;
    isTwoColumn: boolean;
}

export default function PreviewController({ markdown, isTwoColumn }: PreviewControllerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (import.meta.env.SSR) return;

        let isMounted = true;

        const processAndRender = async () => {
            const [
                ReactDOMServer,
                showdownMod,
                mermaidMod,
                katexMod,
                vega,
                vegaLite,
                pagedjs,
            ] = await Promise.all([
                import('react-dom/server.browser'),
                import('showdown'),
                import('mermaid'),
                import('katex'),
                // These modules are browser-safe. Keeping them dynamic avoids SSR bundling issues (e.g. node-canvas).
                // @ts-ignore
                import('vega'),
                // @ts-ignore
                import('vega-lite'),
                import('pagedjs'),
            ]);

            const showdown = (showdownMod as any).default ?? showdownMod;
            const mermaid = (mermaidMod as any).default ?? mermaidMod;
            const katex = (katexMod as any).default ?? katexMod;
            const Previewer = (pagedjs as any).Previewer ?? (pagedjs as any).default?.Previewer;

            let processedText = markdown;

            const vegaRegex = /<div class="vega-lite"([^>]*)>([\s\S]*?)<\/div>/g;
            const vegaMatches = Array.from(processedText.matchAll(vegaRegex));
            const vegaResults = await Promise.all(
                vegaMatches.map(async (match) => {
                    try {
                        const spec = JSON.parse(match[2].trim());
                        const vegaSpec = (vegaLite as any).compile(spec).spec;
                        const view = new (vega as any).View((vega as any).parse(vegaSpec), { renderer: 'svg' });
                        const svg = await view.toSVG();
                        return { original: match[0], replacement: `<div class="vega-container"${match[1]}>${svg}</div>` };
                    } catch (e: any) {
                        return { original: match[0], replacement: `<div class="vega-error">Chart Error: ${e.message}</div>` };
                    }
                })
            );
            for (const result of vegaResults) { processedText = processedText.replace(result.original, result.replacement); }

            (mermaid as any).initialize({ startOnLoad: false, theme: 'base' });
            const mermaidRegex = /<div class="mermaid"([^>]*)>([\s\S]*?)<\/div>/g;
            const mermaidMatches = Array.from(processedText.matchAll(mermaidRegex));
            const mermaidResults = await Promise.all(
                mermaidMatches.map(async (match, i) => {
                    try {
                        const { svg } = await (mermaid as any).render(`mermaid-svg-${Date.now()}-${i}`, match[2].trim());
                        return { original: match[0], replacement: `<div class="mermaid-container"${match[1]}>${svg}</div>` };
                    } catch (e) { return { original: match[0], replacement: `<div class="mermaid-error">Diagram Error</div>` }; }
                })
            );
            for (const result of mermaidResults) { processedText = processedText.replace(result.original, result.replacement); }

            const arrowgramRegex = /<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g;
            const arrowgramMatches = Array.from(processedText.matchAll(arrowgramRegex));
            const arrowgramResults = arrowgramMatches.map((match) => {
                try {
                    const spec = match[2].trim();
                    JSON.parse(spec);
                    const svgString = (ReactDOMServer as any).renderToStaticMarkup(<ArrowGramStatic spec={spec} />);
                    return { original: match[0], replacement: `<div class="arrowgram-container"${match[1]}>${svgString}</div>` };
                } catch (e: any) {
                    console.error("Arrowgram Error:", e);
                    return { original: match[0], replacement: `<div class="arrowgram-error">Diagram Error: ${e.message}</div>` };
                }
            });
            for (const result of arrowgramResults) { processedText = processedText.replace(result.original, result.replacement); }

            const protectedMathBlocks = new Map<string, string>();
            let mathPlaceholderId = 0;
            const protectMath = (block: string) => {
                const placeholder = `AGPROTMATH${mathPlaceholderId++}AGPROT`;
                protectedMathBlocks.set(placeholder, block);
                return placeholder;
            };

            processedText = processedText.replace(/\$\$[\s\S]+?\$\$/g, protectMath);
            processedText = processedText.replace(/\$(?!\$)(?:\\.|[^$\\\n])+\$/g, protectMath);

            const converter = new (showdown as any).Converter({
                metadata: true,
                noHeaderId: true,
                literalMidWordUnderscores: true
            });
            let html = converter.makeHtml(processedText);
            const metadata = converter.getMetadata() as any;

            for (const [placeholder, originalBlock] of protectedMathBlocks.entries()) {
                html = html.split(placeholder).join(originalBlock);
            }

            const protectedBlocks = new Map<string, string>();
            let placeholderId = 0;
            const protectBlock = (block: string) => {
                const placeholder = `__AG_PROTECTED_BLOCK_${placeholderId++}__`;
                protectedBlocks.set(placeholder, block);
                return placeholder;
            };
            html = html.replace(/<pre[^>]*>.*?<\/pre>/gs, protectBlock);
            html = html.replace(/<code[^>]*>.*?<\/code>/gs, protectBlock);

            html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => (katex as any).renderToString(latex.trim(), { throwOnError: false, displayMode: true }));
            html = html.replace(/\$([^$]+?)\$/g, (_match, latex) => (katex as any).renderToString(latex.trim(), { throwOnError: false, displayMode: false }));

            for (const [placeholder, originalBlock] of protectedBlocks.entries()) {
                html = html.replace(placeholder, originalBlock);
            }

            const titleBlockHtml = `<div class="title-block">${metadata.title ? `<div class="title">${metadata.title}</div>` : ''}${metadata.authors ? `<div class="authors">${metadata.authors}</div>` : ''}</div>`;
            const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
            const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${html}</div></div>`;

            if (isMounted && containerRef.current) {
                containerRef.current.innerHTML = '';
                const paged = new (Previewer as any)();
                // @ts-ignore
                (paged as any).preview(finalHtml, ["https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"], containerRef.current);
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
}

