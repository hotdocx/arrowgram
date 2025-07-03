import React, { useState, useCallback } from "react";
import { ArrowGram } from "./ArrowGram";
import { decodeQuiverUrl, encodeArrowgram } from "./utils/quiver";

const quiverSpec3_pullback = `
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "A ×_C B" },
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

export default function App() {
  const [currentSpec, setCurrentSpec] = useState(allSpecs.pullback);
  const [quiverUrl, setQuiverUrl] = useState("");

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
      alert("Quiver URL copied to clipboard!");
    } catch (e) {
      alert(e.message);
    }
  }, [currentSpec]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>arrowgram - hotdocX template</h1>
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
          <button onClick={handleDecode}>Decode URL</button>
          <button onClick={handleEncode}>Encode Current Diagram</button>
        </div>
      </div>
      <h2>Current Diagram</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        Load Example:
        {Object.keys(allSpecs).map(name => (
          <button key={name} onClick={() => setCurrentSpec(allSpecs[name])}>{name}</button>
        ))}
      </div>
      <ArrowGram spec={currentSpec} />
      <hr style={{ margin: '2rem 0' }} />
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
