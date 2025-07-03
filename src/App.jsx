import React from "react";
import { ArrowGram } from "./ArrowGram";

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

const naturalTransformationSpec = `
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 400, "top": 100, "label": "B" }
  ],
  "arrows": [
    { "name": "f", "from": "A", "to": "B", "label": "F(f)", "curve": -40 },
    { "name": "g", "from": "A", "to": "B", "label": "G(f)", "curve": 40 },
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
    { "name": "top_arrow", "from": "A", "to": "B", "label": "f" },
    { "name": "bottom_arrow", "from": "C", "to": "D", "label": "g" },
    { "name": "left_arrow", "from": "A", "to": "C", "label": "α" },
    { "name": "right_arrow", "from": "B", "to": "D", "label": "β" },
    { "name": "diag1", "from": "top_arrow", "to": "right_arrow", "label": "η", "curve": 40, "label_alignment": "left" },
    { "name": "diag2", "from": "left_arrow", "to": "bottom_arrow", "label": "ε", "curve": -40, "label_alignment": "right" }
  ]
}
`;

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>arrowgram - hotdocX template</h1>
      <h2>Pullback Diagram</h2>
      <ArrowGram spec={quiverSpec3_pullback.trim()} />
      <h2>Natural Transformation</h2>
      <ArrowGram spec={naturalTransformationSpec.trim()} />
      <h2>Commutative Square with Higher-Order Arrows</h2>
      <ArrowGram spec={higherOrderSquareSpec.trim()} />
    </div>
  );
}
