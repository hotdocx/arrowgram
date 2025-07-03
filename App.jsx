// hotdocx/src/App.jsx
import React from "react";
import { QuiverDiagram } from "./QuiverDiagram";

const quiverSpec = `
{
  "nodes": [
      { "name": "A", "left": 100, "top": 100, "label": "A" },
      { "name": "B", "left": 500, "top": 100, "label": "B" },
      { "name": "C", "left": 100, "top": 300, "label": "C" },
      { "name": "D", "left": 500, "top": 300, "label": "D" },
      { "name": "E", "left": 100, "top": 500, "label": "E" },
      { "name": "F", "left": 500, "top": 500, "label": "F" }
  ],
  "arrows": [
      { 
          "from": "A", "to": "B", "label": "'over', positive curve",
          "curve": 80, "label_alignment": "over"
      },
      { 
          "from": "C", "to": "D", "label": "'left', positive curve",
          "curve": 80, "label_alignment": "left"
      },
      { 
          "from": "E", "to": "F", "label": "'right', positive curve",
          "curve": 80, "label_alignment": "right"
      },

      { 
          "from": "B", "to": "A", "label": "'over', negative curve",
          "curve": -80, "label_alignment": "over"
      },
      { 
          "from": "D", "to": "C", "label": "'left', negative curve",
          "curve": -80, "label_alignment": "left"
      },
      { 
          "from": "F", "to": "E", "label": "'right', negative curve",
          "curve": -80, "label_alignment": "right"
      }
  ]
}
`;

const quiverSpec2 = `
{
  "nodes": [
      { "name": "T", "left": 100, "top": 100, "label": "T" },
      { "name": "P", "left": 100, "top": 300, "label": "A ×_C B" },
      { "name": "A", "left": 400, "top": 300, "label": "A" },
      { "name": "B", "left": 200, "top": 600, "label": "B" },
      { "name": "C", "left": 700, "top": 700, "label": "C" }
  ],
  "arrows": [
      {
          "from": "P", "to": "A", "label": "p₁", "label_alignment": "left"
      },
      {
          "from": "P", "to": "B", "label": "p₂", "curve": -100,
          "style": { "head": { "name": "epi" } }
      },
      {
          "from": "A", "to": "C", "label": "f", "curve": 190, "label_alignment": "left",
          "style": { "level": 2,  "head": { "name": "epi" },  "tail": { "name": "mono" }  }
      },
      {
          "from": "B", "to": "C", "label": "g", "shift": -25, "curve": -200,
          "style": { "tail": { "name": "mono" } }
      },
      {
          "from": "T", "to": "P", "label": "∃! u",
          "style": { "body": { "name": "dashed" } }
      },
      {
          "from": "A", "to": "A", "label": "id", "radius": 50, "angle": -80, "label_alignment": "right"
      }
  ]
}
`;

const quiverSpec_pullback = `
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "A ×_C B" },
    { "name": "A", "left": 300, "top": 600, "label": "A" },
    { "name": "B", "left": 600, "top": 300, "label": "B" },
    { "name": "C", "left": 600, "top": 600, "label": "C" }
  ],
  "arrows": [
    {
      "from": "P",
      "to": "A",
      "label": "p₁",
      "style": { "tail": { "name": "mono" } }
    },
    {
      "from": "P",
      "to": "B",
      "label": "p₂"
    },
    {
      "from": "A",
      "to": "C",
      "label": "f",
      "label_alignment": "left",
      "style": { "head": { "name": "epi" } }
    },
    {
      "from": "B",
      "to": "C",
      "label": "g",
      "label_alignment": "right",
      "style": { "tail": { "name": "mono" } }
    },
    {
      "from": "T",
      "to": "A",
      "label": "t₁",
      "curve": -80
    },
    {
      "from": "T",
      "to": "B",
      "label": "t₂",
      "curve": 80
    },
    {
      "from": "T",
      "to": "P",
      "label": "∃! u",
      "style": {
        "body": {
          "name": "dashed"
        }
      }
    }
  ]
}
`;

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>arrowgram - hotdocX template</h1>
      <QuiverDiagram spec={quiverSpec_pullback.trim()} />
    </div>
  );
}

// // hotdocx/src/App.jsx
// import React from "react";
// import { QuiverDiagram } from "./QuiverDiagram";

// const quiverSpec = `
// {
//   "nodes": [
//       { "name": "T", "left": 100, "top": 100, "label": "T" },
//       { "name": "P", "left": 100, "top": 300, "label": "A ×_C B" },
//       { "name": "A", "left": 400, "top": 300, "label": "A" },
//       { "name": "B", "left": 200, "top": 600, "label": "B" },
//       { "name": "C", "left": 700, "top": 700, "label": "C" }
//   ],
//   "arrows": [
//       {
//           "from": "P", "to": "A", "label": "p₁", "label_alignment": "left"
//       },
//       {
//           "from": "P", "to": "B", "label": "p₂", "curve": -100,
//           "style": { "head": { "name": "epi" } }
//       },
//       {
//           "from": "A", "to": "C", "label": "f", "curve": 190, "label_alignment": "left",
//           "style": { "level": 2,  "head": { "name": "epi" },  "tail": { "name": "mono" }  }
//       },
//       {
//           "from": "B", "to": "C", "label": "g", "shift": -25, "curve": -200,
//           "style": { "tail": { "name": "mono" } }
//       },
//       {
//           "from": "T", "to": "P", "label": "∃! u",
//           "style": { "body": { "name": "dashed" } }
//       },
//       {
//           "from": "A", "to": "A", "label": "id", "radius": 50, "angle": -80, "label_alignment": "right"
//       }
//   ]
// }
// `;

// export default function App() {
//   return (
//     <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
//       <h1>Categorical Diagram Test (v9 - Corrected)</h1>
//       <p>
//         This diagram demonstrates the fixes for all previously reported issues.
//       </p>
//       <div
//         style={{
//           border: "1px solid #ccc",
//           padding: "10px",
//           height: "80vh",
//           resize: "vertical",
//           overflow: "auto",
//         }}
//       >
//         <QuiverDiagram spec={quiverSpec.trim()} />
//       </div>
//     </div>
//   );
// }

// // hotdocx/src/App.jsx
// import React from "react";
// import { QuiverDiagram } from "./QuiverDiagram";

// const quiverSpec = `
// {
//   "nodes": [
//       { "name": "A", "left": 100, "top": 250, "label": "A" },
//       { "name": "B", "left": 500, "top": 550, "label": "B" }
//   ],
//   "arrows": [
//       {
//           "from": "A", "to": "B", "label": "f (curve: 0)", "label_alignment": "right"
//       },
//       {
//           "from": "A", "to": "B", "label": "g ", "curve": -102
//       },
//       {
//           "from": "A", "to": "B", "label": "h (curve: -123)", "curve": -123, "label_alignment": "right"
//       }
//   ]
// }
// `;

// export default function App() {
//   return (
//     <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
//       <h1>Categorical Diagram Test (v14 - Corrected)</h1>
//       <p>
//         This diagram demonstrates the fix for label placement on curved arrows.
//       </p>
//       <div
//         style={{
//           border: "1px solid #ccc",
//           padding: "10px",
//           height: "80vh",
//           resize: "vertical",
//           overflow: "auto",
//         }}
//       >
//         <QuiverDiagram spec={quiverSpec.trim()} />
//       </div>
//     </div>
//   );
// }
