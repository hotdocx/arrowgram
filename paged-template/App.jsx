import React, { useState, useEffect, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import showdown from 'showdown';
import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';
import katex from 'katex';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { Previewer } from 'pagedjs';
import { ArrowGram } from '../src/ArrowGram';
import './styles.css';

// --- CONFIGURATION ---
const IS_TWO_COLUMN_DEFAULT = false;

const DEFAULT_MARKDOWN_CONTENT = 
`---
title: Final Template with Correct Math Rendering
authors: The HotDocx Team
---

## Introduction
This is the definitive template. The conflict between Showdown's italicization (\`_\`) and KaTeX's subscripts has been resolved. Inline math like $I_{enc}$ and complex equations now render perfectly.

$$
\\oint_C \\mathbf{B} \\cdot d\\mathbf{l} = \\mu_0 \\left( I_{enc} + \\epsilon_0 \\frac{d\\Phi_E}{dt} \\right)
$$

## Vega-Lite Chart Example
Charts remain robust and are generated directly into SVG strings.

<div class="vega-lite">
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data.",
  "data": { "values": [{"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43}] },
  "mark": "bar",
  "encoding": { "x": {"field": "a"}, "y": {"field": "b"}}
}
</div>

## Arrowgram Diagram
This example renders a pullback diagram using \`arrowgram\`.

<div class="arrowgram">
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "$A \\times_C B$" },
    { "name": "A", "left": 300, "top": 600, "label": "A" },
    { "name": "B", "left": 600, "top": 300, "label": "B" },
    { "name": "C", "left": 600, "top": 600, "label": "C" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "$p_1$", "label_alignment": "right", "style": { "tail": { "name": "mono" } } },
    { "from": "P", "to": "B", "label": "p₂" },
    { "from": "A", "to": "C", "label": "$f$", "label_alignment": "left", "style": { "head": { "name": "epi" } } },
    { "from": "B", "to": "C", "label": "g", "label_alignment": "right", "style": { "tail": { "name": "mono" } } },
    { "from": "T", "to": "A", "label": "t₁", "curve": -80 },
    { "from": "T", "to": "B", "label": "t₂", "curve": 80 },
    { "from": "T", "to": "P", "label": "∃! u", "style": { "body": { "name": "dashed" } } }
  ]
}
</div>

## Mermaid Diagram
Mermaid diagrams continue to use the same proven pre-processing method.

<div class="mermaid">
graph TD
    A["Input"] --> B{"Compile Vega/Mermaid to SVG"};
    B --> C["Convert Markdown (KaTeX-Safe)"];
    C --> D["Render Final Paged Document"];
</div>
`;

const PreviewController = ({ markdown, isTwoColumn }) => {
  const containerRef = useRef(null);

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
          } catch (e) {
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
          const svgString = ReactDOMServer.renderToStaticMarkup(<ArrowGram spec={spec} />);
          return { original: match[0], replacement: `<div class="arrowgram-container"${match[1]}>${svgString}</div>` };
        } catch (e) {
          console.error("Arrowgram Error:", e);
          return { original: match[0], replacement: `<div class="arrowgram-error">Diagram Error: ${e.message}</div>` };
        }
      });
      for (const result of arrowgramResults) { processedText = processedText.replace(result.original, result.replacement); }
      
      // 4. Convert Markdown to HTML with KaTeX-safe options
      const converter = new showdown.Converter({
        metadata: true,
        noHeaderId: true,
        literalMidWordUnderscores: true // *** The crucial fix for KaTeX ***
      });
      let html = converter.makeHtml(processedText);
      const metadata = converter.getMetadata();

      // 5. Process LaTeX math with KaTeX using robust regex
      // Display mode: $$...$$
      html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: true }));
      // Inline mode: $...$ (non-greedy)
      html = html.replace(/\$([^$]+?)\$/g, (match, latex) => katex.renderToString(latex.trim(), { throwOnError: false, displayMode: false }));
      
      // 6. Assemble final HTML for Paged.js
      const titleBlockHtml = `<div class="title-block">${metadata.title ? `<div class="title">${metadata.title}</div>` : ''}${metadata.authors ? `<div class="authors">${metadata.authors}</div>` : ''}</div>`;
      const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
      const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${html}</div></div>`;

      if (isMounted && containerRef.current) {
        containerRef.current.innerHTML = '';
        const paged = new Previewer();
        paged.preview(finalHtml, [], containerRef.current);
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
  const [markdown, setMarkdown] = useState('Loading...');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isTwoColumn, setIsTwoColumn] = useState(IS_TWO_COLUMN_DEFAULT);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch('/public/index.md');
        if (response.ok) {
          const text = await response.text();
          setMarkdown(text);
          setIsPreviewing(true);
        } else {
          setMarkdown(DEFAULT_MARKDOWN_CONTENT);
        }
      } catch (error) {
        setMarkdown(DEFAULT_MARKDOWN_CONTENT);
      }
    };
    loadContent();
  }, []);

  if (isPreviewing) {
    return (
      <div className="preview-container">
        <div className="preview-controls">
          <button className="control-button" onClick={() => setIsPreviewing(false)}>Back to Editor</button>
          <button className="control-button" onClick={() => window.print()}>Print to PDF</button>
        </div>
        <PreviewController markdown={markdown} isTwoColumn={isTwoColumn} />
      </div>
    );
  }

  return (
    <div className="editor-container">
      <h1>Markdown to Paged Paper</h1>
      <p>Use custom divs for charts (`&ltdiv class="vega-lite"&gt...`), diagrams (`&ltdiv class="mermaid"&gt...`), and arrowgrams (`&ltdiv class="arrowgram"&gt...`).</p>
      <textarea
        id="markdown-input"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        disabled={markdown === 'Loading...'}
      />
      <div className="editor-controls">
        <div className="layout-toggle">
          <span>Layout Style:</span>
          <button className={`toggle-button ${!isTwoColumn ? 'active' : ''}`} onClick={() => setIsTwoColumn(false)}>Single-Column</button>
          <button className={`toggle-button ${isTwoColumn ? 'active' : ''}`} onClick={() => setIsTwoColumn(true)}>Two-Column</button>
        </div>
        <button className="action-button" onClick={() => setIsPreviewing(true)}>Render Document</button>
      </div>
    </div>
  );
}