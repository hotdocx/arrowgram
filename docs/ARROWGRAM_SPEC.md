# Arrowgram JSON API Specification

**Arrowgram format version:** 1

**Document revision:** 2026-08-30

**Source of truth:** `packages/arrowgram/src/types.ts` plus semantic validation in `packages/arrowgram/src/schema/`

## 1. Overview
An Arrowgram diagram is a JSON object matching `DiagramSpec`. Canonical validation is strict: unknown properties are rejected at every object boundary. Runtime validation also enforces identity, endpoint, dependency-cycle, depth, and loop invariants that ordinary JSON Schema cannot express.

The published `packages/arrowgram/arrowgram.schema.json` is the structural Draft 2020-12 contract. Call `parseDiagramSpec` or `validateDiagramSpec` after structural validation to enforce the complete semantic contract.

### ⚠️ Critical Note on String Escaping
Because the diagram is defined in JSON, all backslashes must be escaped. This is especially important for LaTeX commands in labels.
*   **Wrong:** `"label": "$A \to B$"` (Invalid JSON)
*   **Correct:** `"label": "$A \\to B$"` (JSON parser reads this as `$A \to B`)

## 2. Root Object (`DiagramSpec`)

```typescript
interface DiagramSpec {
  version?: 1;              // Format version; omitted input canonicalizes to 1
  nodes: NodeSpec[];        // List of nodes (vertices)
  arrows?: ArrowSpec[];     // List of arrows (edges)
}
```

Canonical output always contains `version: 1` and an `arrows` array. Explicit versions other than `1` are rejected.

## 3. Nodes (`NodeSpec`)

Nodes represent the objects in the category (sets, spaces, etc.).

```typescript
interface NodeSpec {
  name: string;             // Non-empty unique endpoint ID (maximum 256 code points)
  label?: string;           // Plain text or inline LaTeX such as "$A$"
  color?: string;           // Hex color code (e.g. "#FF0000" or "red"). Default: "black".
  left: number;             // X coordinate (pixels)
  top: number;              // Y coordinate (pixels)
}
```

Node names must be unique and may not collide with a named arrow. Logical IDs beginning with `__arrowgram_internal__` are reserved for computed renderer identity. Coordinates are finite pixels in the inclusive range `-1_000_000..1_000_000`.

## 4. Arrows (`ArrowSpec`)

Arrows represent morphisms or relationships.

```typescript
interface ArrowSpec {
  // Connectivity
  from: string;             // Non-empty ID of the source Node or explicitly named Arrow
  to: string;               // Non-empty ID of the target Node or explicitly named Arrow
  name?: string;            // Unique endpoint ID; required if another arrow references this arrow
  
  // Content
  label?: string;           // Plain text or inline LaTeX (e.g., "$f$", "$\\pi$")
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
  shorten?: {               // Nonnegative shortening at each end (pixels).
      source?: number;      // Gap at source.
      target?: number;      // Gap at target.
  };
  
  // Styling
  style?: ArrowStyleSpec;
}
```

Named arrows share the node endpoint namespace, so duplicate names and node/arrow collisions are invalid. Renderer-only IDs such as legacy `_arrow_0` values or the reserved internal namespace are not portable endpoints. All endpoints must resolve and the named-arrow dependency graph must be acyclic with depth at most 128.

Arrow bodies are rendered from the post-node, post-shortening visible source point to the visible target point. If requested source plus target shortening exceeds the available path, Arrowgram proportionally clamps both values and returns a `geometry.shorten_clamped` warning containing requested/effective lengths.

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
  level?: 1 | 2 | 3;       // 1 = single, 2 = double (=>), 3 = triple
  
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

1.  **Naming:** An arrow used as an endpoint *must* have an explicit unique `name`.
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

## 5. Coordinate System And Limits
*   **Origin:** (0, 0) is the Top-Left corner.
*   **Units:** Pixels.
*   **Grid:** The editor defaults to a 40px grid, but coordinates can be arbitrary.

Canonical package limits are deliberately larger than ordinary editor diagrams:

| Value | Limit |
|---|---:|
| Nodes | 1,000 |
| Arrows | 4,000 |
| Logical ID | 256 Unicode code points |
| Label | 16,384 Unicode code points |
| Coordinate magnitude | 1,000,000 px |
| Curve, shift, radius, or shortening magnitude | 1,000,000 px |
| Angle magnitude before normalization | 1,000,000 degrees |
| Higher-order dependency depth | 128 |

All numeric values must be finite. Self-loops default to radius 40 when radius is omitted; an explicitly zero loop radius is invalid. Negative loop radii remain supported for direction reversal. URL/resource-bearing SVG paint values are rejected in color fields.

### 5.1. Label grammar

- Plain text needs no delimiter: `"label": "Object A"`.
- Unescaped `$...$` creates an inline KaTeX segment: `"label": "Object $A$"`.
- A label may alternate text and math segments: `"label": "map $f$ at $x$"`.
- `\$` represents a literal dollar in text and remains escaped for KaTeX inside math.
- Unterminated or empty math spans fail computation with `label.unterminated_math` or `label.empty_math` at the exact node/arrow label path.
- A KaTeX parse failure remains visible as labelled fallback text in the React renderer, sets `data-arrowgram-label-error="true"`, and is available through the renderer diagnostic callback.

Computed label layout is shared by bounds, masks, and React markup. `label_alignment: "over"` rotates both the label and its mask in explicit SVG degrees.

## 6. Validation, Diagnostics, And Legacy Input

Use the discriminated vNext APIs for new integrations:

```typescript
const parsed = parseDiagramSpec(input);
if (!parsed.ok) {
  console.error(parsed.diagnostics);
  return;
}

const computed = computeDiagramResult(parsed.value);
if (!computed.ok) {
  console.error(computed.diagnostics);
  return;
}
```

Diagnostics have stable `code`, `severity`, `phase`, `path`, and optional entity/source metadata. JSON syntax, structural schema, semantic graph, geometry, label, and rendering failures are distinguishable.

The React API exposes caller-supplied title/description, decorative mode, a deterministic textual node/edge summary, instance-scoped mask IDs, accessible KaTeX MathML, and an optional label-render diagnostic callback.

Some older Arrowgram editor documents contain renderer-only `uniqueId` fields. Canonical parsing rejects them. Recovery must be explicit:

```typescript
const parsed = parseDiagramSpec(input, { normalizeLegacy: true });
// parsed.diagnostics contains one legacy.unique_id_removed warning per change.
```

The normalizer removes only catalogued legacy residue, never unrelated unknown fields, and never mutates the supplied value.

## 7. Examples

**Disclaimer:** These examples must be kept in sync with the JSON schema defined in `packages/arrowgram/src/types.ts`. If the schema changes, these examples must be updated.

### 7.1. Pullback Square (Corner)

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

### 7.2. Adjunction ($F \dashv G$)

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

### 7.3. Isomorphism ($A \cong B$)

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

### 7.4. Natural Transformation (2-cell)

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

### 7.5. Maps To ($x \mapsto y$)

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

### 7.6. Node to Arrow Connection

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

### 7.7. Shortening and Label Alignment

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
