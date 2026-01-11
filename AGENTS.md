# Arrowgram for AI Agents

This document provides instructions for AI coding agents to generate commutative diagrams using the `arrowgram` package.

## 1. Overview

`arrowgram` uses a declarative JSON specification to render diagrams. As an AI, you can generate this JSON to visualize mathematical concepts.

## 2. JSON Specification Format

A valid spec is a JSON object with:
-   `nodes`: Array of objects.
-   `arrows`: Array of objects.

### 2.1. Nodes
```json
{
  "name": "UniqueID",    // Required: string (e.g., "A", "N1")
  "label": "$LaTeX$",    // Display text (supports LaTeX with $)
  "left": 100,           // X position (number)
  "top": 200             // Y position (number)
}
```

### 2.2. Arrows
```json
{
  "name": "optID",       // Optional: needed if this arrow is a target for another arrow
  "from": "SourceID",    // Node name OR Arrow name
  "to": "TargetID",      // Node name OR Arrow name
  "label": "f",          // Label
  "curve": 0,            // Curvature (number, pos/neg for direction)
  "style": {
    "head": { "name": "normal" | "epi" | "none" },
    "tail": { "name": "mono" | "none" },
    "body": { "name": "solid" | "dashed" | "dotted" },
    "level": 1           // 1=single, 2=double (equality)
  }
}
```

## 3. Examples

### Example: Pullback Square

```json
{
  "nodes": [
    { "name": "P", "left": 100, "top": 100, "label": "$A \\times_C B$" },
    { "name": "A", "left": 100, "top": 300, "label": "A" },
    { "name": "B", "left": 300, "top": 100, "label": "B" },
    { "name": "C", "left": 300, "top": 300, "label": "C" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "p1" },
    { "from": "P", "to": "B", "label": "p2" },
    { "from": "A", "to": "C", "label": "f" },
    { "from": "B", "to": "C", "label": "g" }
  ]
}
```

### Example: Adjunction (Natural Transformation)

```json
{
  "nodes": [
    { "name": "C", "left": 0, "top": 100, "label": "C" },
    { "name": "D", "left": 300, "top": 100, "label": "D" }
  ],
  "arrows": [
    { "name": "F", "from": "C", "to": "D", "label": "F", "curve": -40 },
    { "name": "G", "from": "D", "to": "C", "label": "G", "curve": -40 },
    // Unit of adjunction: id -> GF
    // This is tricky to draw purely with 2 nodes, often drawn as a symbol.
    // Arrowgram supports arrows between arrows.
  ]
}
```

## 4. Best Practices for Agents

1.  **Coordinate System**: The canvas usually starts at (0,0). Increment `left` by 200-300px for columns, `top` by 200px for rows.
2.  **Unique Names**: Always ensure node `name`s are unique.
3.  **LaTeX**: Always wrap math in `$` for proper rendering (e.g., `$A \\otimes B$`). Escape backslashes in JSON strings (`\\otimes`).
