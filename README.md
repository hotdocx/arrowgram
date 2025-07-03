## `arrowgram`

`arrowgram` is a React component that renders SVG diagrams of arrows, nodes, and labels from a declarative JSON specification. It is designed for creating mathematical diagrams, such as commutative diagrams used in category theory, directly within a web application.

The component is self-contained, performing all necessary geometric calculations to translate the abstract specification into a visually clear SVG representation. It is intended for use in markdown rendering pipelines or interactive development environments like Sandpack.

## Architecture and Design

The architecture of `arrowgram` is centered around a single, robust React component, `<ArrowGram />`.

-   **Component-Based:** The entire diagram rendering logic is encapsulated within the `ArrowGram.jsx` component. This makes it easy to integrate into any React application.
-   **Declarative Specification:** The design separates the diagram's definition (the "what") from its rendering (the "how"). Users provide a simple JSON object describing the nodes and arrows, and the component handles the complex task of drawing it. This makes creating and modifying diagrams straightforward.
-   **Stateless Rendering:** The component is designed to be stateless. It receives a JSON specification as a prop and renders the corresponding SVG. All calculations are derived from these props, using `useMemo` for performance optimization.

## Implementation

The implementation handles the entire pipeline from parsing the JSON spec to rendering a dynamic, auto-sizing SVG.

### Core Component: `<ArrowGram />`

This is the main component that orchestrates the rendering process.

1.  **Parsing:** It accepts a JSON string (`spec`) as a prop, which it parses into a JavaScript object.
2.  **Model Creation:** It processes the `nodes` and `arrows` from the spec to create an internal, render-ready data structure. This involves creating models for standard arrows and for loops (arrows that start and end on the same node).
3.  **ViewBox Calculation:** It dynamically calculates the SVG `viewBox` by determining the bounding box of all nodes and arrow control points. This ensures the entire diagram is always visible without being manually resized.
4.  **SVG Rendering:** It maps over the internal models and renders them as a series of SVG `<g>`, `<path>`, and `<text>` elements.

### Input: The JSON Specification

A diagram is defined by a JSON object with two main keys: `nodes` and `arrows`.

#### Node Objects

A node is an object that defines a point in the diagram.

-   `name` (string): A unique identifier for the node.
-   `label` (string): The text to display for the node.
-   `left` (number): The x-coordinate of the node's center.
-   `top` (number): The y-coordinate of the node's center.

#### Arrow Objects

An arrow connects two nodes and can be extensively customized.

-   `name` (string, optional): A unique identifier for the arrow. Required if the arrow is to be used as a source or target for another arrow.
-   `from` (string): The `name` of the starting node or arrow.
-   `to` (string): The `name` of the ending node or arrow.
-   `label` (string, optional): Text to display alongside the arrow.
-   `curve` (number, optional): A value to control the curvature of the arrow. Positive values curve one way, negative values the other. Defaults to `0` (a straight line).
-   `shift` (number, optional): A value to shift the arrow perpendicular to its direction, useful for parallel arrows that might otherwise overlap. Defaults to `0`.
-   `label_alignment` (string, optional): Positions the label. Can be `"over"` (default), `"left"`, or `"right"`.
-   `style` (object, optional): An object to control the visual style of the arrow's parts.
    -   `body`: `{ "name": "solid" | "dashed" | "dotted" }`
    -   `head`: `{ "name": "normal" | "epi" | "none" }`
    -   `tail`: `{ "name": "mono" | "none" }`
-   `level` (number, optional): Draws multiple parallel lines for the arrow body. Defaults to `1`.

### Supported Arrow Styles

The `style` property allows for various common diagramming conventions:

-   **Body Styles:**
    -   `solid`: A standard solid line.
    -   `dashed`: A dashed line, often used for existential arrows.
    -   `dotted`: A dotted line.
-   **Head/Tail Styles:** These are inspired by category theory notations.
    -   `normal`: A standard arrowhead (`->`).
    -   `epi`: A double arrowhead, representing an epimorphism (`->>`).
    -   `mono`: An arrowhead rendered at the tail of the arrow, representing a monomorphism (`>->`).

## Example

The following JSON spec demonstrates how to create a pullback diagram:

```json
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "A ×_C B" },
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
```

## Future Work

-   [ ] Implement utilities to decode a `q.uiver.app` share URL into the JSON spec of an arrowgram.
-   [ ] Implement utilities to encode a JSON spec of an arrowgram into a `q.uiver.app` share URL.
-   [ ] Expand the range of available arrow and node styles.
