import React from 'react';
import ReactDOMServer from 'react-dom/server';
import showdown from 'showdown';
import mermaid from 'mermaid';
import katex from 'katex';
// @ts-ignore
import * as vega from 'vega';
// @ts-ignore
import * as vegaLite from 'vega-lite';
import { Previewer } from 'pagedjs';
import { ArrowGramStatic } from '../components/ArrowGramStatic';

// Use the reference CSS known to work, enhanced for on-screen preview
const PRINT_STYLES = `
/* General Body and Reset */
body { 
    margin: 0; 
    padding: 0; 
    background-color: #f0f2f5; /* Match editor background */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    width: 100%;
}

/* Page size and margins - General */
@page { size: 8.5in 11in; margin: 1in; }

/* Base typography */
.pagedjs_page_content { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }

/* Dynamic Layout Styles */
.layout-two-column .paper-body { columns: 2; column-gap: 0.25in; }
.layout-two-column .title-block, .layout-two-column h1, .layout-two-column h2, .layout-two-column h3 { column-span: all; }
.layout-two-column .abstract { break-inside: avoid; column-span: all; text-align: justify; }
.layout-two-column .abstract h2 { font-size: 12pt; font-weight: bold; text-align: center; }

/* Content Components */
.katex-display { display: block; text-align: center; margin: 1em 0; break-inside: avoid; }
.mermaid-container, .vega-container, .arrowgram-container { page-break-inside: avoid; display: flex; justify-content: center; margin: 1em 0; }
.mermaid-container svg, .vega-container svg, .arrowgram-container svg { max-width: 100%; height: auto !important; }
.mermaid-error, .vega-error, .arrowgram-error { border: 1px solid red; padding: 1em; color: red; text-align: center; font-family: monospace; }
.paper-body h1, .paper-body h2, .paper-body h3 { break-after: avoid-column; }
.title-block { text-align: center; margin-bottom: 2em; line-height: 1.3; }
.title { font-size: 20pt; font-weight: bold; margin-bottom: 0.75em; }
.authors { font-size: 14pt; margin-bottom: 0.75em; }
.paper-body p, .paper-body li { text-align: justify; }

/* SCREEN ONLY: Make it look like a nice paper preview */
@media screen {
    .pagedjs_pages {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
        padding: 40px 0;
        width: 100%;
    }

    .pagedjs_page {
        background-color: white;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
        margin: 0 auto;
        /* Ensure the page is rendered with correct dimensions on screen */
        flex: none;
    }
}

/* PRINT ONLY: Reset for the actual PDF generation */
@media print {
    body { background-color: white; }
    .pagedjs_pages { display: block; width: 100%; padding: 0; }
    .pagedjs_page { 
        box-shadow: none; 
        margin: 0; 
        background-color: white;
    }
}
`;

export async function printDocument(markdown: string, isTwoColumn: boolean) {
    // 1. Open a new window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print.");
        return;
    }

    // 2. Set up initial HTML structure
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Preview</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <style>${PRINT_STYLES}</style>
        </head>
        <body>
            <div id="print-content">Processing...</div>
        </body>
        </html>
    `);
    printWindow.document.close();

    try {
        // 3. Process Content (Identical to Reference Implementation)
        let processedText = markdown;

        // Vega-Lite
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

        // Mermaid
        mermaid.initialize({ startOnLoad: false, theme: 'base' });
        const mermaidRegex = /<div class="mermaid"([^>]*)>([\s\S]*?)<\/div>/g;
        const mermaidMatches = Array.from(processedText.matchAll(mermaidRegex));
        const mermaidResults = await Promise.all(
            mermaidMatches.map(async (match, i) => {
                try {
                    const { svg } = await mermaid.render(`mermaid-svg-print-${Date.now()}-${i}`, match[2].trim());
                    return { original: match[0], replacement: `<div class="mermaid-container"${match[1]}>${svg}</div>` };
                } catch (e) { return { original: match[0], replacement: `<div class="mermaid-error">Diagram Error</div>` }; }
            })
        );
        for (const result of mermaidResults) { processedText = processedText.replace(result.original, result.replacement); }

        // ArrowGram
        const arrowgramRegex = /<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g;
        const arrowgramMatches = Array.from(processedText.matchAll(arrowgramRegex));
        const arrowgramResults = arrowgramMatches.map((match) => {
            try {
                const spec = match[2].trim();
                JSON.parse(spec); // Validate JSON
                const svgString = ReactDOMServer.renderToStaticMarkup(<ArrowGramStatic spec={spec} />);
                return { original: match[0], replacement: `<div class="arrowgram-container"${match[1]}>${svgString}</div>` };
            } catch (e: any) {
                console.error("Arrowgram Print Error:", e);
                return { original: match[0], replacement: `<div class="arrowgram-error">Diagram Error: ${e.message}</div>` };
            }
        });
        for (const result of arrowgramResults) { processedText = processedText.replace(result.original, result.replacement); }

        // Markdown -> HTML
        const converter = new showdown.Converter({
            metadata: true,
            noHeaderId: true,
            literalMidWordUnderscores: true
        });
        let html = converter.makeHtml(processedText);
        const metadata = converter.getMetadata() as any;

        // KaTeX
        const protectedBlocks = new Map();
        let placeholderId = 0;
        const protectBlock = (block: string) => {
            const placeholder = `__AG_PROTECTED_BLOCK_${placeholderId++}__`;
            protectedBlocks.set(placeholder, block);
            return placeholder;
        };
        html = html.replace(/<pre[^>]*>.*?<\/pre>/gs, protectBlock);
        html = html.replace(/<code[^>]*>.*?<\/code>/gs, protectBlock);

        html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: true }));
        html = html.replace(/\$([^$]+?)\$/g, (_match, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: false }));

        for (const [placeholder, originalBlock] of protectedBlocks.entries()) {
            html = html.replace(placeholder, originalBlock);
        }

        // Final HTML Wrapper
        const titleBlockHtml = `<div class="title-block">${metadata.title ? `<div class="title">${metadata.title}</div>` : ''}${metadata.authors ? `<div class="authors">${metadata.authors}</div>` : ''}</div>`;
        const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
        const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${html}</div></div>`;

        // 4. Render with Paged.js in the new window
        const container = printWindow.document.getElementById('print-content');
        if (container) {
            container.innerHTML = ''; // Clear "Processing..."
            const paged = new Previewer();
            
            // We pass the styles as a Data URI to ensure Paged.js picks them up in its internal iframe/process if needed,
            // though keeping them in the head usually works.
            const pagedStyles = `
                @page { size: 8.5in 11in; margin: 1in; }
                .pagedjs_page_content { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }
            `;
            // @ts-ignore
            await paged.preview(finalHtml, [
                "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
            ], container);

            // 5. Trigger Print
            setTimeout(() => {
                printWindow.print();
                // Optional: printWindow.close(); // Don't close immediately so user can see it
            }, 1000);
        }

    } catch (e) {
        console.error("Print generation failed:", e);
        if (printWindow) printWindow.document.body.innerHTML = `<div style="color:red; padding: 20px;"><h1>Print Error</h1><p>${e}</p></div>`;
    }
}
