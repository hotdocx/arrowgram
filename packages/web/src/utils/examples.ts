export const quiverSpec3_pullback = `
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "$A \\times_C B$" },
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

export const naturalTransformationSpec = `
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

export const higherOrderSquareSpec = `
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

export const higherOrderceptionSpec = `
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

export const EXAMPLES: Record<string, string> = {
  "Pullback": quiverSpec3_pullback.trim(),
  "Natural Transformation": naturalTransformationSpec.trim(),
  "Higher Order Square": higherOrderSquareSpec.trim(),
  "Higher Orderception": higherOrderceptionSpec.trim(),
};
