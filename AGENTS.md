# Arrowgram for AI Agents

This document describes how AI Coding Agents (like yourself) should generate Arrowgram specifications.

## Overview

Arrowgram is a library for rendering commutative diagrams. It uses a JSON specification to define nodes and arrows.
Your goal is to accept a user's natural language description (e.g., "Draw a pullback square" or "Create a triangle with f, g, h") and output a VALID JSON object adhering to the schema below.

## JSON Schema

The full schema is available at `packages/arrowgram/arrowgram.schema.json`.

### Key Properties

-   **nodes**: Array of `{ name, label, left, top }`.
    -   `left`, `top`: Coordinates in pixels. Assume a canvas of roughly 800x600. Standard spacing is ~200px.
-   **arrows**: Array of `{ from, to, label, curve, style }`.
    -   `curve`: Number. `0` = straight. positive = curves left. negative = curves right.
    -   `style`: `{ head: { name }, tail: { name }, body: { name }, level: number }`.

## Styles Reference

-   **Monomorphism** (Hook tail): `style: { tail: { name: "mono" } }`
-   **Epimorphism** (Two heads): `style: { head: { name: "epi" } }`
-   **Isomorphism** (Tilde): *Not fully supported via style yet, typically denoted by label `\\cong`.*
-   **Double Arrow** (Implication): `style: { level: 2 }`
-   **Dashed Arrow**: `style: { body: { name: "dashed" } }`

## Chain of Thought Examples

### Example 1: Pullback Square

**User**: "Draw a pullback square with nodes A, B, C, D."

**Agent Thought Process**:
1.  **Layout**: A square layout is needed. Let's put A top-left, B top-right, C bottom-left, D bottom-right.
    -   A: (100, 100)
    -   B: (300, 100)
    -   C: (100, 300)
    -   D: (300, 300)
2.  **Arrows**: Standard pullback logic.
    -   A -> B (Top horizontal)
    -   A -> C (Left vertical)
    -   B -> D (Right vertical)
    -   C -> D (Bottom horizontal)
3.  **Labels**: User didn't specify, so use generic or empty. Let's use standard $f, g, p_1, p_2$.

**Output JSON**:
```json
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 300, "top": 100, "label": "B" },
    { "name": "C", "left": 100, "top": 300, "label": "C" },
    { "name": "D", "left": 300, "top": 300, "label": "D" }
  ],
  "arrows": [
    { "from": "A", "to": "B", "label": "f" },
    { "from": "A", "to": "C", "label": "g" },
    { "from": "B", "to": "D", "label": "p_1" },
    { "from": "C", "to": "D", "label": "p_2" }
  ]
}
```

### Example 2: Adjunction

**User**: "Draw an adjunction between C and D with left adjoint F and right adjoint G."

**Agent Thought Process**:
1.  **Layout**: Two nodes, C and D, side-by-side.
    -   C: (100, 200)
    -   D: (400, 200)
2.  **Arrows**:
    -   F: C -> D (Top curve)
    -   G: D -> C (Bottom curve)
3.  **Curvature**:
    -   F should curve "up" (left relative to C->D direction? No, C->D is Right. Left of Right is Up. So curve positive.)
    -   G should curve "down" (left relative to D->C direction? Left of Left is Down. So curve positive.)
    -   Wait, let's just use opposite curves. F curve +30, G curve +30 (both curve to their left).

**Output JSON**:
```json
{
  "nodes": [
    { "name": "C", "left": 100, "top": 200, "label": "\\mathcal{C}" },
    { "name": "D", "left": 400, "top": 200, "label": "\\mathcal{D}" }
  ],
  "arrows": [
    { "from": "C", "to": "D", "label": "F", "curve": 40 },
    { "from": "D", "to": "C", "label": "G", "curve": 40 }
  ]
}
```
