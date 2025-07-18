import React, { useState, useCallback, useEffect } from "react";
import { ArrowGram } from "./ArrowGram";
import { ArrowGramEditor } from "./ArrowGramEditor";
import { decodeQuiverUrl, encodeArrowgram } from "./utils/quiver";
import { exportToTikz } from "./utils/tikz";
import { TikzExportModal } from './TikzExportModal';
import { saveSvgAsPng } from 'save-svg-as-png';
import { saveAs } from 'file-saver';


const quiverSpec3_pullback = `
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "$A \\\\times_C B$" },
    { "name": "A", "left": 300, "top": 600, "label": "A" },
    { "name": "B", "left": 600, "top": 300, "label": "B" },
    { "name": "C", "left": 600, "top": 600, "label": "C" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "p₁", "style": { "tail": { "name": "mono" } } },
    { "from": "P", "to": "B", "label": "p₂" },
    { "from": "A", "to": "C", "label": "f", "label_alignment": "left", "style": { "head": { "name": "epi" } } },
    { "from": "B", "to": "C", "label": "g", "label_alignment": "right", "style": { "tail": { "name": "mono" } } },
    { "from": "T", "to": "A", "label": "t₁", "curve": -80 },
    { "from": "T", "to": "B", "label": "t₂", "curve": 80 },
    { "from": "T", "to": "P", "label": "∃! u", "style": { "body": { "name": "dashed" } } }
  ]
}
`;

const naturalTransformationSpec = `
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 400, "top": 100, "label": "B" }
  ],
  "arrows": [
    { "name": "f", "from": "A", "to": "B", "label": "F(f)", "curve": -90 },
    { "name": "g", "from": "A", "to": "B", "label": "G(f)", "curve": 90 },
    { "name": "eta", "from": "f", "to": "g", "label": "η", "style": { "head": { "name": "epi" } } }
  ]
}
`;

const higherOrderSquareSpec = `
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 500, "top": 100, "label": "B" },
    { "name": "C", "left": 100, "top": 400, "label": "C" },
    { "name": "D", "left": 500, "top": 400, "label": "D" }
  ],
  "arrows": [
    { "name": "top_arrow", "from": "A", "to": "B", "label": "f", "curve": 90 },
    { "name": "bottom_arrow", "from": "C", "to": "D", "label": "g" },
    { "name": "left_arrow", "from": "A", "to": "C", "label": "α" },
    { "name": "right_arrow", "from": "B", "to": "D", "label": "β" },
    { "name": "diag1", "from": "top_arrow", "to": "right_arrow", "label": "η", "curve": 40, "label_alignment": "left",
      "style": { "level": 2,  "head": { "name": "epi" },  "tail": { "name": "mono" }  } },
    { "name": "diag2", "from": "left_arrow", "to": "bottom_arrow", "label": "ε", "curve": -40, "label_alignment": "right" }
  ]
}
`;

const higherOrderceptionSpec = `
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 600, "top": 100, "label": "B" },
    { "name": "C", "left": 100, "top": 400, "label": "C" },
    { "name": "D", "left": 600, "top": 400, "label": "D" }
  ],
  "arrows": [
    { "name": "f1", "from": "A", "to": "B", "label": "f₁", "curve": -90 },
    { "name": "f2", "from": "A", "to": "B", "label": "f₂", "curve": 90 },
    { "name": "g1", "from": "C", "to": "D", "label": "g₁", "curve": -60 },
    { "name": "g2", "from": "C", "to": "D", "label": "g₂", "curve": 60 },
    { "name": "h1", "from": "f1", "to": "f2", "label": "h₁", "curve": -90,
      "style": { "level": 2 }  },
    { "name": "h2", "from": "g1", "to": "g2", "label": "h₂", "curve": 90  },
    { "name": "h3", "from": "h1", "to": "h2", "label": "h₃", "curve": -50,
      "style": { "level": 3 } }
  ]
}
`;

const allSpecs = {
  pullback: quiverSpec3_pullback.trim(),
  natural_transformation: naturalTransformationSpec.trim(),
  higher_order_square: higherOrderSquareSpec.trim(),
  higher_orderception: higherOrderceptionSpec.trim(),
};

const initialEditorSpec = `
{
  "nodes": [
    { "name": "A", "left": 150, "top": 150, "label": "A" },
    { "name": "B", "left": 450, "top": 150, "label": "B" }
  ],
  "arrows": [
    { "name": "f", "from": "A", "to": "B", "label": "f" }
  ]
}
`;

export default function App() {
  const [currentSpec, setCurrentSpec] = useState(allSpecs.pullback);
  const [quiverUrl, setQuiverUrl] = useState("");
  const [editorSpec, setEditorSpec] = useState(null);
  const [tikzExport, setTikzExport] = useState({ code: null });

  useEffect(() => {
    // Load spec from URL on initial render
    const urlParams = new URLSearchParams(window.location.search);
    const specParam = urlParams.get('spec');
    if (specParam) {
      try {
        const decodedString = atob(specParam);
        const bytes = new Uint8Array(decodedString.length);
        for (let i = 0; i < decodedString.length; i++) {
          bytes[i] = decodedString.charCodeAt(i);
        }
        const decodedSpec = new TextDecoder().decode(bytes);
        setEditorSpec(decodedSpec);
      } catch (e) {
        console.error("Failed to decode spec from URL", e);
        setEditorSpec(initialEditorSpec); // Fallback on error
      }
    } else {
        setEditorSpec(initialEditorSpec);
    }
  }, []);

  const handleShare = useCallback(() => {
    try {
      // Handle Unicode characters by encoding to UTF-8 before base64
      const uint8Array = new TextEncoder().encode(editorSpec);
      // This is a common trick to convert a Uint8Array to a binary string
      const charString = String.fromCharCode.apply(null, uint8Array);
      const encodedSpec = btoa(charString);

      const url = `${window.location.origin}${window.location.pathname}?spec=${encodedSpec}`;
      navigator.clipboard.writeText(url);
      alert("Shareable URL copied to clipboard!");
    } catch (e) {
      console.error("Failed to encode spec for sharing:", e);
      alert("Failed to create shareable URL. See console for details.");
    }
  }, [editorSpec]);

  const handleExport = useCallback(async (format) => {
    if (format === 'tikz') {
        const tikzString = exportToTikz(editorSpec);
        setTikzExport({ code: tikzString });
        return;
    }

    const svgElement = document.getElementById('diagram-for-export');
    if (!svgElement) {
        alert("Could not find the diagram to export.");
        return;
    }
    
    if (format === 'svg') {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        saveAs(blob, 'diagram.svg');
    } else if (format === 'png') {
        const viewBox = svgElement.getAttribute('viewBox');
        const options = {
            backgroundColor: 'white',
            scale: 2, // for higher resolution
        };

        if (viewBox) {
            const parts = viewBox.split(' ').map(parseFloat);
            options.left = parts[0];
            options.top = parts[1];
            options.width = parts[2];
            options.height = parts[3];
        }
        
        saveSvgAsPng(svgElement, 'diagram.png', options).catch(e => {
            console.error("PNG Export failed:", e);
            alert("Failed to export as PNG. See console for details.");
        });
    }
  }, [editorSpec]);


  const handleDecode = useCallback(() => {
    try {
      const specObject = decodeQuiverUrl(quiverUrl);
      console.log("[DEBUG] decoded quiver url ", {specObject});
      setCurrentSpec(JSON.stringify(specObject, null, 2));
    } catch (e) {
      alert(e.message);
    }
  }, [quiverUrl]);

  const handleEncode = useCallback(() => {
    try {
      const specObject = JSON.parse(currentSpec);
      const dataString = encodeArrowgram(specObject);
      const url = `https://q.uiver.app/#q=${dataString}`;
      setQuiverUrl(url);
      navigator.clipboard.writeText(url);
      alert("Quiver URL for static diagram copied to clipboard!");
    } catch (e) {
      alert(e.message);
    }
  }, [currentSpec]);
  
  const handleEncodeEditor = useCallback(() => {
    try {
      const specObject = JSON.parse(editorSpec);
      const dataString = encodeArrowgram(specObject);
      const url = `https://q.uiver.app/#q=${dataString}`;
      setQuiverUrl(url);
      navigator.clipboard.writeText(url);
      alert("Quiver URL from editor copied to clipboard!");
    } catch (e) {
      alert(e.message);
    }
  }, [editorSpec]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>arrowgram - hotdocX template</h1>
      <a href="/paged-template.html">Example: arrowgram inside a hotdocX paged template</a>

      <hr style={{ margin: '2rem 0' }} />
      <h2>Interactive Diagram Editor</h2>
       {editorSpec && <>
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px' }}>
            <button onClick={handleShare}>Share</button>
            <button onClick={() => handleExport('svg')}>Export SVG</button>
            <button onClick={() => handleExport('png')}>Export PNG</button>
            <button onClick={() => handleExport('tikz')}>Export TikZ</button>
        </div>
        <ArrowGramEditor spec={editorSpec} onSpecChange={setEditorSpec} />
        <TikzExportModal 
            tikzCode={tikzExport.code} 
            onClose={() => setTikzExport({ code: null })}
        />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div style={{flex: 1}}>
              <h3>Live JSON Specification</h3>
              <textarea 
                value={editorSpec}
                onChange={(e) => setEditorSpec(e.target.value)}
                rows={20} 
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
              />
          </div>
          <div style={{flex: 1}}>
              <h3>Live Preview</h3>
              <div style={{border: '1px solid #eee', padding: '1rem', minHeight: '300px', height: '100%', boxSizing: 'border-box'}}>
                  <ArrowGram spec={editorSpec} id="diagram-for-export" />
              </div>
          </div>
        </div>
        <button onClick={handleEncodeEditor} style={{marginTop: '0.5rem'}}>Encode Editor Diagram to Quiver URL</button>
      </>}


      <hr style={{ margin: '2rem 0' }} />
      <div style={{ marginBottom: '2rem' }}>
        <h2>Quiver Conversion</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text"
            value={quiverUrl}
            onChange={(e) => setQuiverUrl(e.target.value)}
            placeholder="Paste q.uiver.app URL here"
            style={{ width: '400px', padding: '8px' }}
          />
          <button onClick={handleDecode}>Decode URL to Static Diagram</button>
          <button onClick={handleEncode}>Encode Static Diagram</button>
        </div>
      </div>
      <h2>Current Static Diagram (from Examples or Decode)</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        Load Example:
        {Object.keys(allSpecs).map(name => (
          <button key={name} onClick={() => setCurrentSpec(allSpecs[name])}>{name}</button>
        ))}
      </div>
      <ArrowGram spec={currentSpec} />
      <hr style={{ margin: '2rem 0' }} />
      <h2>Static Examples</h2>
      <h2>Pullback Diagram</h2>
      <ArrowGram spec={quiverSpec3_pullback.trim()} />
      <h2>Natural Transformation</h2>
      <ArrowGram spec={naturalTransformationSpec.trim()} />
      <h2>Commutative Square with Higher-Order Arrows</h2>
      <ArrowGram spec={higherOrderSquareSpec.trim()} />
      <h2>Arrows Between Higher-Order Arrows</h2>
      <ArrowGram spec={higherOrderceptionSpec.trim()} />
    </div>
  );
}