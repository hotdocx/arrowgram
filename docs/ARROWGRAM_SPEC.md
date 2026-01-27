# Arrowgram JSON API Specification

**Version:** 1.1.0
**Source of Truth:** `packages/arrowgram/src/types.ts`

## 1. Overview
The Arrowgram diagram is defined by a JSON object matching the `DiagramSpec` interface. This specification is strict; additional properties outside of this spec may be ignored or cause validation errors.

### ⚠️ Critical Note on String Escaping
Because the diagram is defined in JSON, all backslashes must be escaped. This is especially important for LaTeX commands in labels.
*   **Wrong:** `"label": "$A \to B$"` (Invalid JSON)
*   **Correct:** `"label": "$A \\to B$"` (JSON parser reads this as `$A \to B`)

## 2. Root Object (`DiagramSpec`)

```typescript
interface DiagramSpec {
  version?: number;         // Schema version (default: 1)
  nodes: NodeSpec[];        // List of nodes (vertices)
  arrows?: ArrowSpec[];     // List of arrows (edges)
}
```

## 3. Nodes (`NodeSpec`)

Nodes represent the objects in the category (sets, spaces, etc.).

```typescript
interface NodeSpec {
  name: string;             // Unique identifier (used in ArrowSpec.from/to)
  label?: string;           // LaTeX label to display (e.g., "$A$", "$X \\otimes Y$"). MUST be wrapped in $.
  color?: string;           // Hex color code (e.g. "#FF0000" or "red"). Default: "black".
  left: number;             // X coordinate (pixels)
  top: number;              // Y coordinate (pixels)
}
```

## 4. Arrows (`ArrowSpec`)

Arrows represent morphisms or relationships.

```typescript
interface ArrowSpec {
  // Connectivity
  from: string;             // 'name' of the source Node or Arrow
  to: string;               // 'name' of the target Node or Arrow
  name?: string;            // Unique identifier for this arrow (optional, required if target of another arrow)
  
  // Content
  label?: string;           // LaTeX label (e.g., "$f$", "$\\pi$"). MUST be wrapped in $.
  label_alignment?: "over" | "left" | "right"; // Default: "over" (on top of line) or "left" depending on context.
  color?: string;           // Color of the arrow stroke (e.g. "#FF0000").
  label_color?: string;     // Color of the label text.
  
  // Geometry
  curve?: number;           // Curvature amplitude (pixels). 
                            // 0 = Straight. 
                            // >0 = Curve Left (CCW). <0 = Curve Right (CW).
  shift?: number;           // Parallel offset (pixels). Useful for double arrows ($f, g: A \\to B$). 
  radius?: number;          // Radius for loops.
  angle?: number;           // Exit angle for loops (degrees).
  shorten?: {               // Shorten the arrow at ends (pixels).
      source?: number;      // Gap at source.
      target?: number;      // Gap at target.
  };
  
  // Styling
  style?: ArrowStyleSpec;
}
```

### 4.1. Arrow Styling (`ArrowStyleSpec`)

Controls the visual appearance of the edge.

```typescript
interface ArrowStyleSpec {
  // General Mode
  mode?: "arrow" | "adjunction" | "corner" | "corner_inverse";
  // "adjunction": Renders a turnstile symbol (-|) perpendicular to the path.
  // "corner": Renders a pullback corner symbol (⌟).
  // "corner_inverse": Renders a pushout corner symbol (⌜).

  // Line Style
  level?: number;           // 1 = single, 2 = double (=>), 3 = triple
  
  // Components
  body?: {
    name?: 
      | "solid"         // Default
      | "dashed" 
      | "dotted" 
      | "squiggly"      // Wavy line (~) (Alias: "wavy")
      | "barred"        // Proarrow (-|-)
      | "double_barred" // (-||-)
      | "bullet_solid"  // -•-
      | "bullet_hollow" // -o-
      | "none"          // Invisible body
  };

  head?: {
    name?: "normal" | "none" | "epi" | "hook" | "maps_to" | "harpoon";
    // "maps_to": Renders a vertical bar (|). Combined with "tail: maps_to" creates |-|, or with "tail: normal" creates ->|.
    // "hook": Renders a curved hook (e.g., used for inclusion).
    // "epi": Two arrowheads (->>).
    side?: "top" | "bottom"; // For harpoons/hooks
  };

  tail?: {
    name?: "normal" | "none" | "mono" | "hook" | "maps_to";
    // "maps_to": Renders a vertical bar (|). Combined with "head: normal" creates a standard maps-to arrow (|->).
    // "mono": Tail with a hook (>-).
    side?: "top" | "bottom";
  };
}
```

### 4.2. Higher-Order Arrows (2-cells)
Arrows can connect to other arrows (e.g., for natural transformations $\alpha: F \Rightarrow G$).

1.  **Naming:** The target arrow *must* have a defined `name`.
2.  **referencing:** The 2-cell arrow uses that `name` in its `from` or `to` fields.
3.  **Endpoint:** The connection point is the midpoint of the target arrow.

```typescript
// Example: Arrow 'alpha' pointing from arrow 'F' to arrow 'G'
{
  "arrows": [
    { "name": "F", "from": "A", "to": "B", "label": "$F$", "curve": -30 },
    { "name": "G", "from": "A", "to": "B", "label": "$G$", "curve": 30 },
    { "from": "F", "to": "G", "label": "$\\alpha$", "style": { "level": 2 } }
  ]
}
```

## 5. Coordinate System
*   **Origin:** (0, 0) is the Top-Left corner.
*   **Units:** Pixels.
*   **Grid:** The editor defaults to a 40px grid, but coordinates can be arbitrary.

## 6. Examples

**Disclaimer:** These examples must be kept in sync with the JSON schema defined in `packages/arrowgram/src/types.ts`. If the schema changes, these examples must be updated.

### 6.1. Pullback Square (Corner)

A standard commutative square with a limit (pullback) structure. Note the `corner` mode.

```json
{
  "version": 1,
  "nodes": [
    { "name": "P", "left": 100, "top": 100, "label": "$P$" },
    { "name": "X", "left": 300, "top": 100, "label": "$X$" },
    { "name": "Y", "left": 100, "top": 300, "label": "$Y$" },
    { "name": "Z", "left": 300, "top": 300, "label": "$Z$" }
  ],
  "arrows": [
    { "from": "P", "to": "X", "label": "$f'$" },
    { "from": "P", "to": "Y", "label": "$g'$" },
    { "from": "X", "to": "Z", "label": "$f$" },
    { "from": "Y", "to": "Z", "label": "$g$" },
    { "from": "P", "to": "Z", "style": { "mode": "corner" } }
  ]
}
```

### 6.2. Adjunction ($F \dashv G$)

Demonstrates the use of `curve` for bending arrows and `style.mode: "adjunction"` for the turnstile symbol.

```json
{
  "nodes": [
    { "name": "C", "left": 100, "top": 200, "label": "$\\mathcal{C}$" },
    { "name": "D", "left": 400, "top": 200, "label": "$\\mathcal{D}$" }
  ],
  "arrows": [
    { "from": "C", "to": "D", "label": "$F$", "curve": 40 },
    { "from": "D", "to": "C", "label": "$G$", "curve": 40 },
    { "from": "C", "to": "D", "style": { "mode": "adjunction" } }
  ]
}
```

### 6.3. Isomorphism ($A \cong B$)

Using styled arrows to denote isomorphism.

```json
{ 
  "version": 1,
  "nodes": [
      { "name": "A", "left": 100, "top": 100, "label": "$A$" },
      { "name": "B", "left": 300, "top": 100, "label": "$B$" }
  ],
  "arrows": [
      {
          "from": "A", 
          "to": "B", 
          "label": "$\\cong$", 
          "style": { 
              "body": { "name": "solid" }, 
              "head": { "name": "none" }, 
              "tail": { "name": "none" } 
          } 
      }
  ]
}
```

### 6.4. Natural Transformation (2-cell)

Connecting arrows to arrows. Note that `F` and `G` are given names so `alpha` can connect them.

```json
{
  "nodes": [
    { "name": "A", "left": 100, "top": 200, "label": "$A$" },
    { "name": "B", "left": 400, "top": 200, "label": "$B$" }
  ],
  "arrows": [
    { "name": "F", "from": "A", "to": "B", "label": "$F$", "curve": -40 },
    { "name": "G", "from": "A", "to": "B", "label": "$G$", "curve": 40 },
    { "from": "F", "to": "G", "label": "$\\alpha$", "style": { "level": 2 } }
  ]
}
```

### 6.5. Maps To ($x \mapsto y$)

Using tail styling to create a "maps to" arrow.

```json
{
  "nodes": [
    { "name": "x", "left": 100, "top": 100, "label": "$x$" },
    { "name": "y", "left": 300, "top": 100, "label": "$y$" }
  ],
  "arrows": [
    {
      "from": "x", 
      "to": "y", 
      "style": {
        "tail": { "name": "maps_to" }
      }
    }
  ]
}
```

### 6.6. Node to Arrow Connection

An arrow starting from a node and ending on another arrow.

```json
{
  "nodes": [
      { "name": "A", "left": 100, "top": 100, "label": "$A$" },
      { "name": "B", "left": 300, "top": 100, "label": "$B$" },
      { "name": "C", "left": 200, "top": 200, "label": "$C$" }
  ],
  "arrows": [
      { "name": "f", "from": "A", "to": "B", "label": "$f$" },
      { "from": "C", "to": "f", "label": "$h$", "style": { "body": { "name": "dotted" } } }
  ]
}
```

### 6.7. Shortening and Label Alignment

Using `shorten` to create gaps and `label_alignment` to place text.

```json
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "$A$" },
    { "name": "B", "left": 300, "top": 100, "label": "$B$" }
  ],
  "arrows": [
    {
      "from": "A", "to": "B", 
      "label": "offset label",
      "label_alignment": "left",
      "shorten": { "source": 20, "target": 20 }
    }
  ]
}
```
