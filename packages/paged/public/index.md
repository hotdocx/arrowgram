---
title: Welcome to Arrowgram Paged Viewer
authors: Your AI Agent & You
---

# Introduction

This is a sample document to demonstrate the capabilities of the **Arrowgram Paged Viewer**. 

## Mathematics

We support LaTeX via KaTeX:
$$
f(x) = \int_{-\infty}^\infty \hat f(\xi)\,e^{2\pi i \xi x} \,d\xi
$$

## Arrowgram Diagrams

Here is a commutative diagram:

<div class="arrowgram">
{
  "version": 1,
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "$A$" },
    { "name": "B", "left": 300, "top": 100, "label": "$B$" },
    { "name": "C", "left": 100, "top": 300, "label": "$C$" },
    { "name": "D", "left": 300, "top": 300, "label": "$D$" }
  ],
  "arrows": [
    { "from": "A", "to": "B", "label": "$f: A \\to B$" },
    { "from": "A", "to": "C", "label": "$g$" },
    { "from": "B", "to": "D", "label": "$h$" },
    { "from": "C", "to": "D", "label": "$k$" }
  ]
}
</div>

## Charts (Vega-Lite)

<div class="vega-lite">
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data.",
  "data": {
    "values": [
      {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
      {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
      {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "b", "type": "quantitative"}
  }
}
</div>

## Mermaid Diagrams

<div class="mermaid">
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
</div>
