# Arrowgram API Documentation for AI Agents

## Overview
`@arrowgram/core` is a library for defining and rendering commutative diagrams. As an AI agent, you can generate diagrams by producing JSON objects that conform to the `DiagramSpec` interface.

## Core Schema

The source of truth is the JSON specification. Do not invent properties.

### 1. `DiagramSpec` (Root)
```typescript
interface DiagramSpec {
  version: 1;
  nodes: NodeSpec[];
  arrows: ArrowSpec[];
}
```

### 2. `NodeSpec`
Represents a mathematical object (Set, Category, Space).

```typescript
interface NodeSpec {
  name: string;      // UNIQUE identifier (e.g., "A", "node_1")
  label: string;     // LaTeX content (e.g., "A", "X \times Y", "\\mathbb{R}")
  left: number;      // X coordinate (0-1000 usually)
  top: number;       // Y coordinate (0-1000 usually)
}
```
*Note: Layout is Cartesian. (0,0) is Top-Left.*

### 3. `ArrowSpec`
Represents a morphism or map between objects.

```typescript
interface ArrowSpec {
  from: string;      // ID of the source Node
  to: string;        // ID of the target Node
  label?: string;    // LaTeX label (e.g., "f", "g \circ h")
  
  // Geometry
  curve?: number;    // Curvature: -100 to 100. 0 = Straight. 
                     // Positive = Curve Left/Up (CCW relative to vector).
                     // Negative = Curve Right/Down.
  shift?: number;    // Parallel shift in pixels. Useful for double arrows.
  
  // Positioning
  label_alignment?: "over" | "left" | "right" | "center"; // Default: "left" (relative to arrow direction)
  
  // Styling
  style?: {
    head?: {
      name?: "normal" | "none" | "epi" | "hook" | "maps_to"; // "epi" = ->>, "hook" = inclusion
    };
    tail?: {
      name?: "normal" | "none" | "mono" | "maps_to"; // "mono" = >->
    };
    body?: {
      name?: "solid" | "dashed" | "dotted" | "wavy";
    };
    level?: number;  // 1 = single (->), 2 = double (=>), 3 = triple
  };
}
```

## Example: Pullback Square

To generate a Pullback Square, output this JSON:

```json
{
  "version": 1,
  "nodes": [
    { "name": "P", "left": 100, "top": 100, "label": "P" },
    { "name": "X", "left": 300, "top": 100, "label": "X" },
    { "name": "Y", "left": 100, "top": 300, "label": "Y" },
    { "name": "Z", "left": 300, "top": 300, "label": "Z" }
  ],
  "arrows": [
    { "from": "P", "to": "X", "label": "f'" },
    { "from": "P", "to": "Y", "label": "g'" },
    { "from": "X", "to": "Z", "label": "f" },
    { "from": "Y", "to": "Z", "label": "g" }
  ]
}
```

## Best Practices for Agents

1.  **Layout Logic:** When asked for "Category A", arrange nodes logically.
    *   **Triangles:** (100,100), (300,100), (200, 300).
    *   **Squares:** (100,100), (300,100), (100,300), (300,300).
    *   **Limits/Colimits:** Central object should be offset from the diagram it limits.
2.  **Naming:** Use descriptive IDs if possible (`node_A`, `node_AxB`) but simple ones (`n1`, `n2`) are fine if internal.
3.  **Labels:** Always use LaTeX. No plain text unless it's a variable name.
4.  **Curvature:** If two arrows go between the same nodes (e.g., adjunction), use `curve: 20` and `curve: -20`.

## Advanced Usage: Isomorphisms & Adjunctions

**Isomorphism ($A \cong B$):**
Use a double-headed arrow or two arrows.
```json
{ "from": "A", "to": "B", "label": "\\cong", "style": { "body": { "name": "solid" }, "head": { "name": "none" }, "tail": { "name": "none" } } }
```
*(Better native support coming soon)*

**Adjunction ($F \dashv G$):**
Two curved arrows + a symbol in the middle (requires 2-cell support, currently approximated by label placement).

```json
{
  "nodes": [
    { "name": "C", "left": 100, "top": 200, "label": "\\mathcal{C}" },
    { "name": "D", "left": 400, "top": 200, "label": "\\mathcal{D}" }
  ],
  "arrows": [
    { "from": "C", "to": "D", "label": "F", "curve": 40 },
    { "from": "D", "to": "C", "label": "G", "curve": -40 }
  ]
}
```