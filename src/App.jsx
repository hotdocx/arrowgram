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

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>arrowgram - hotdocX template</h1>
      <ArrowGram spec={quiverSpec3_pullback.trim()} />
    </div>
  );
}
