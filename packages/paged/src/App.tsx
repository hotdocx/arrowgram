import { useState, useEffect, useRef } from 'react';
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
            const staticDiagrams = new Map<string, string>();
            let diagramPlaceholderId = 0;
            const createPlaceholder = (content: string) => {
                const id = `AGDIAGRAM${diagramPlaceholderId++}AGDIAGRAM`;
                staticDiagrams.set(id, content);
                return id;
            };

            // 0. Pre-process Vega-Lite charts directly to SVG strings
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

            // 1. Pre-process Mermaid diagrams
            mermaid.initialize({ startOnLoad: false, theme: 'base' });
            const mermaidRegex = /<div class="mermaid"([^>]*)>([\s\S]*?)<\/div>/g;
            const mermaidMatches = Array.from(processedText.matchAll(mermaidRegex));
            const mermaidResults = await Promise.all(
                mermaidMatches.map(async (match, i) => {
                    const id = `ag-paged-mermaid-${Date.now()}-${i}`;
                    try {
                        const { svg } = await mermaid.render(id, match[2].trim());
                        const fullHtml = `<div class="mermaid-container"${match[1]}>${svg}</div>`;
                        const placeholder = createPlaceholder(fullHtml);
                        return { original: match[0], replacement: `<div id="${placeholder}" class="mermaid-placeholder"></div>` };
                    } catch (e) { return { original: match[0], replacement: `<div class="mermaid-error">Diagram Error</div>` }; }
                })
            );
            for (const result of mermaidResults) { processedText = processedText.replace(result.original, result.replacement); }

            // 2. Pre-process Arrowgram diagrams
            const arrowgramRegex = /<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g;
            const arrowgramMatches = Array.from(processedText.matchAll(arrowgramRegex));
            const arrowgramResults = arrowgramMatches.map((match, i) => {
                const id = `ag-paged-arrowgram-${Date.now()}-${i}`;
                try {
                    const spec = match[2].trim();
                    JSON.parse(spec); // Validate JSON
                    const svgString = ReactDOMServer.renderToStaticMarkup(<ArrowGramStatic spec={spec} id={id} />);
                    const fullHtml = `<div class="arrowgram-container"${match[1]}>${svgString}</div>`;
                    const placeholder = createPlaceholder(fullHtml);
                    return { original: match[0], replacement: `<div id="${placeholder}" class="arrowgram-placeholder"></div>` };
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

            // Restore diagrams (Arrowgram & Mermaid)
            for (const [placeholder, originalBlock] of staticDiagrams.entries()) {
                const needle = `<div id="${placeholder}" class="mermaid-placeholder"></div>`;
                const needle2 = `<div id="${placeholder}" class="arrowgram-placeholder"></div>`;
                // Try both, or just check which map it came from?
                // We reused `staticDiagrams` for both. The ID `AGDIAGRAM...` is in `placeholder`.
                // The replacement text in processedText was `<div id="AGDIAGRAM..." ...></div>`.
                // Showdown might have wrapped it or changed attributes order?
                // Actually, since the ID is unique, we can regex replace based on ID.
                // Or just use a simpler placeholder text like for math.
                // But wait, the math placeholders are simple strings. The diagram placeholders are divs.
                // Let's assume Showdown respects the div.
                html = html.split(needle).join(originalBlock);
                html = html.split(needle2).join(originalBlock);
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

export default function App() {
    const [markdown, setMarkdown] = useState<string | null>(null);
    const [isTwoColumn, setIsTwoColumn] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const requested = (params.get('paper') || '').trim();
        const isLocalStorageRef = /^ls:/i.test(requested);
        const isAbsoluteUrl = /^https?:\/\//i.test(requested);
        // Treat "/index.md" as relative to the app base (useful on GitHub Pages subpaths).
        const requestedPath = isAbsoluteUrl ? requested : requested.replace(/^\/+/, '');
        const normalized =
            requestedPath === '' || requestedPath === 'index' || requestedPath === 'index.md'
                ? 'index.md'
                : requestedPath === '0' || requestedPath === 'index_0' || requestedPath === 'index_0.md'
                    ? 'index_0.md'
                    : requestedPath;

        if (isLocalStorageRef) {
            const key = requested.replace(/^ls:/i, '').trim();
            if (!key) {
                setMarkdown(`# Error: Could not load localStorage paper\n\nPass a key as \`?paper=ls:some_key\`.`);
                return;
            }

            const stored = localStorage.getItem(key);
            if (stored == null) {
                setMarkdown(`# Error: Could not load localStorage key \`${key}\`\n\nNo value found. Create it in localStorage first (same origin), or use \`?paper=index.md\`.\n\nTip: you can also pass an absolute URL via \`?paper=https://example.com/index.md\`.`);
                return;
            }

            setMarkdown(stored);
            return;
        }

        const safe = isAbsoluteUrl
            ? normalized
            : /^[A-Za-z0-9_.-]+\.md$/.test(normalized)
              ? normalized
              : 'index.md';

        const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
        const paperUrl = isAbsoluteUrl
            ? safe
            : new URL(safe, baseUrl).toString();

        // Fetch the selected paper from public folder (default: index.md relative to BASE_URL).
        // Also supports absolute URLs via ?paper=https://example.com/index.md
        fetch(paperUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load content');
                return response.text();
            })
            .then(text => setMarkdown(text))
            .catch(err => {
                console.error(err);
                setMarkdown(`# Error: Could not load ${paperUrl}\n\nPlease ensure \`print/public/${isAbsoluteUrl ? 'index.md' : safe}\` exists, or open with \`?paper=index.md\` / \`?paper=index_0.md\`.\n\nTip: you can also load from localStorage via \`?paper=ls:some_key\`, or pass an absolute URL via \`?paper=https://example.com/index.md\`.`);
            });
    }, []);

    if (!markdown) return <div className="loading-indicator">Loading Content...</div>;

    return (
        <div className="preview-container">
            <div className="preview-controls">
                <button
                    className={`control-button ${isTwoColumn ? 'active' : ''}`}
                    onClick={() => setIsTwoColumn(!isTwoColumn)}
                >
                    {isTwoColumn ? 'Single Column' : 'Two Column'}
                </button>
                <button className="control-button" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
            <PreviewController markdown={markdown} isTwoColumn={isTwoColumn} />
        </div>
    );
}
