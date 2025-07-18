## `arrowgram`

`arrowgram` is a React component that renders SVG diagrams of arrows, nodes, and labels from a declarative JSON specification. It is designed for creating mathematical diagrams, such as commutative diagrams used in category theory, directly within a web application.

The component is self-contained, performing all necessary geometric calculations to translate the abstract specification into a visually clear SVG representation. It is intended for use in markdown rendering pipelines or interactive development environments like Sandpack.

### Quick links

[1] *arrowgram AI Template in hotdocx Publisher Web App*. [https://hotdocx.github.io/#/hdx/25188CHRI26000](https://hotdocx.github.io/#/hdx/25188CHRI26000) 

[2] *emdash functorial programming language for ω-categories and schemes*. [https://github.com/hotdocx/emdash](https://github.com/hotdocx/emdash) 

### Other links

[3] *emdash Experiment-able Testing Playground in hotdocx Publishers*. [https://hotdocx.github.io/#/hdx/25188CHRI27000](https://hotdocx.github.io/#/hdx/25188CHRI27000) 

[4] *emdash Re-formattable Technical Report in hotdocx Publisher*. [https://hotdocx.github.io/#/hdx/25188CHRI25004](https://hotdocx.github.io/#/hdx/25188CHRI25004) 

[5] *jsCoq AI Template for Coq in hotdocx Publisher*. [https://hotdocx.github.io/#/hdx/25191CHRI43000](https://hotdocx.github.io/#/hdx/25191CHRI43000)

[6] *hotdocX GitHub Sponsored Profile*. [https://github.com/sponsors/hotdocx](https://github.com/sponsors/hotdocx)

![The arrowgram editor showing a complex diagram, with the property inspector on the right and live JSON spec below.](./arrowgram-editor.png)

## Key Features

-   **Declarative JSON:** Define complex diagrams with a simple and intuitive JSON structure.
-   **Interactive Editor:** A rich, grid-based editor to create and modify diagrams visually. Supports creating nodes, dragging to connect arrows, panning, zooming, and a property inspector for fine-tuning.
-   **SVG Rendering:** Automatically renders clean, auto-sizing SVG diagrams that fit any layout.
-   **KaTeX Math Support:** Render complex mathematical formulas in labels using familiar LaTeX syntax.
-   **Higher-Order Arrows:** Create arrows between other arrows, essential for 2-category diagrams and natural transformations.
-   **`q.uiver.app` Interoperability:** Seamlessly import diagrams from and export them to `q.uiver.app` share URLs.
-   **Customizable Styling:** A range of styling options for arrows (solid, dashed, dotted), heads (normal, epi), and tails (mono).

## Live Demo & Editor

This repository includes a powerful demonstration app (`src/App.jsx`) that showcases all of `arrowgram`'s features, centered around the interactive editor.

-   **Interactive Canvas:** A grid-based canvas where you can create nodes (double-click), move them (drag), and create arrows between nodes or other arrows (Ctrl/Cmd-drag).
-   **Pan and Zoom:** Easily navigate large diagrams by dragging the canvas to pan and using the mouse wheel to zoom.
-   **Property Inspector:** Select any node or arrow to edit its properties—such as labels, curvature, and styles—in a dedicated panel.
-   **Live JSON and Preview:** See the underlying JSON specification update in real-time as you edit the diagram visually. A separate static preview shows the final rendered output.
-   **Sharing and Exporting:**
    -   Generate a shareable URL that encodes the entire diagram specification.
    -   Export your finished diagram as a standalone SVG or high-resolution PNG file.
    -   Export diagrams to `tikz-cd` format for use in LaTeX documents.
    -   Convert diagrams to and from the `q.uiver.app` format.

## Architecture and Design

The architecture of `arrowgram` is modular, separating concerns to maximize flexibility and code reuse.

-   **Diagram Engine (`diagramModel.js`):** This is the core of the library. It's a pure function that takes a JSON spec and performs all the complex geometric calculations required to render the diagram. It computes node positions, arrow paths, control points for curves, label positions, and the overall SVG `viewBox`. This stateless engine is used by both the static renderer and the interactive editor.

-   **Diagram Renderer (`ArrowGramDiagram.jsx`):** A presentational React component that takes the computed model from the diagram engine and renders the corresponding SVG elements (`<path>`, `<g>`, `<foreignObject>`, etc.). It also handles the integration with KaTeX for rendering mathematical labels. Because it's a "dumb" component focused only on rendering, it can be used in any context.

-   **Static Component (`ArrowGram.jsx`):** A simple, stateless wrapper designed for easily embedding diagrams. It accepts a JSON string as a prop, runs it through the engine, and passes the resulting model to the `ArrowGramDiagram` renderer.

-   **Editor Component (`ArrowGramEditor.jsx`):** A full-featured interactive editor component. It manages its own state for user interactions (e.g., selection, interaction mode) and handles all user input events on the SVG canvas. It uses `ArrowGramDiagram` to render the base diagram and then layers the interactive elements (selection highlights, connection lines) on top. When the user makes a change, the editor updates the JSON spec and notifies the parent component via an `onSpecChange` callback.

-   **Property Inspector (`PropertyEditor.jsx`):** A companion to the editor that displays a form for editing the properties (label, curve, style, etc.) of the currently selected node or arrow.

## Core Concepts

### Higher-Order Arrows

A key feature of `arrowgram` is its ability to render "higher-order arrows"—arrows that have other arrows as their source or target.

This is achieved by treating every arrow as a potential "virtual node." When an arrow is defined, the component calculates its midpoint. If another arrow uses the first arrow's `name` as its `from` or `to` property, the component uses this calculated midpoint as the connection point.

To prevent visual overlap, the component also calculates a "radius" for these virtual nodes, ensuring that the connecting arrow starts and ends with a clean gap, just as it would with a regular node. This allows for creating complex, multi-level diagrams like 2-cells in category theory.

## Integration in a Rendering Pipeline

`arrowgram` is designed to be easily integrated into document-rendering pipelines that process extended markdown. By wrapping a valid `arrowgram` JSON specification in a `<div>`, you can process and embed diagrams alongside other content types like `vega-lite` charts or `mermaid` diagrams.

The processor should find blocks like the one below, parse the JSON content, render it to an SVG string using the `<ArrowGram />` component, and replace the original `<div>` with the resulting SVG.

**Example Markdown:**
```markdown
<div class="arrowgram">
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 400, "top": 100, "label": "B" }
  ],
  "arrows": [
    { "name": "eta", "from": "A", "to": "B", "label": "$\\eta$" }
  ]
}
</div>
```
The `paged-template` directory in this project contains a complete example of such a pipeline using `showdown`, `pagedjs`, and `katex`.

## The JSON Specification

A diagram is defined by a JSON object with two main keys: `nodes` and `arrows`.

#### Node Objects

-   `name` (string): A unique identifier for the node.
-   `label` (string): The text to display. Supports KaTeX math by wrapping formulas in `$`, e.g., `"$A \\times_C B$"`.
-   `left`, `top` (number): The x and y coordinates.

#### Arrow Objects

-   `name` (string, optional): A unique identifier, required if the arrow is a source/target for another arrow.
-   `from`, `to` (string): The `name` of the starting and ending node *or arrow*.
-   `label` (string, optional): Text displayed alongside the arrow. Supports KaTeX math by wrapping formulas in `$`, e.g., `"$F(f)$"`.
-   `curve` (number, optional): Controls curvature.
-   `shift` (number, optional): Shifts the arrow perpendicular to its direction.
-   `label_alignment` (string, optional): `"over"` (default), `"left"`, or `"right"`.
-   `style` (object, optional): Controls visual style.
    -   `body`: `{ "name": "solid" | "dashed" | "dotted" }`
    -   `head`: `{ "name": "normal" | "epi" | "none" }`
    -   `tail`: `{ "name": "mono" | "none" }`
-   `level` (number, optional): Draws multiple parallel lines for the arrow body (e.g., for equality).

### `q.uiver.app` Interoperability

The utilities in `src/utils/quiver.js` provide two-way compatibility with `q.uiver.app`. Because `q.uiver.app` renders all labels as math by default, the utilities perform automatic conversion.

-   `decodeQuiverUrl(url)`: Parses a `q.uiver.app` share URL. During import, it automatically wraps all diagram labels with `$` delimiters to ensure they are rendered correctly by `arrowgram`'s internal KaTeX processor.
-   `encodeArrowgram(spec)`: Takes an `arrowgram` JSON spec and generates a `q.uiver.app` share URL. During export, it automatically removes the `$` delimiters from labels, as `q.uiver.app` will render them as math by default.

### Exporting to `tikz-cd`

The editor supports exporting diagrams to the `tikz-cd` format, widely used in LaTeX for creating commutative diagrams. The export utility converts the JSON specification into a `tikzcd` environment.

For example, a simple diagram might be exported as:
```latex
% https://q.uiver.app/#q=WzAsNCxbMCwwLCJBIl0sWzEsMCwiQiJdLFsxLDEsIkQiXSxbMCwxLCJDIl0sWzAsMSwiZiJdLFszLDIsImgiXSxbMCwzLCJnIl0sWzEsMiwiaCJdXQ==
\begin{tikzcd}
	A & B \\
	C & D
	\arrow["f", from=1-1, to=1-2]
	\arrow["h", from=2-1, to=2-2]
	\arrow["g", from=1-1, to=2-1]
	\arrow["h", from=1-2, to=2-2]
\end{tikzcd}
```

## Example Specs

The demo application allows you to load several examples that demonstrate the capabilities of `arrowgram`.

### Pullback Diagram

A standard diagram in category theory, showcasing basic nodes, arrows, and styling (mono, epi, dashed).

```json
{
  "nodes": [
    { "name": "T", "left": 100, "top": 100, "label": "T" },
    { "name": "P", "left": 300, "top": 300, "label": "$A \\times_C B$" },
    { "name": "A", "left": 300, "top": 600, "label": "A" },
    { "name": "B", "left": 600, "top": 300, "label": "B" },
    { "name": "C", "left": 600, "top": 600, "label": "C" }
  ],
  "arrows": [
    { "from": "P", "to": "A", "label": "$p_1$", "style": { "tail": { "name": "mono" } } },
    { "from": "P", "to": "B", "label": "$p_2$" },
    { "from": "A", "to": "C", "label": "f", "label_alignment": "left", "style": { "head": { "name": "epi" } } },
    { "from": "B", "to": "C", "label": "g", "label_alignment": "right", "style": { "tail": { "name": "mono" } } },
    { "from": "T", "to": "A", "label": "$t_1$", "curve": -80 },
    { "from": "T", "to": "B", "label": "$t_2$", "curve": 80 },
    { "from": "T", "to": "P", "label": "$\\exists! u$", "style": { "body": { "name": "dashed" } } }
  ]
}
```

### Natural Transformation

This example demonstrates a higher-order arrow (`eta`) connecting two parallel arrows (`f` and `g`), representing a natural transformation.

```json
{
  "nodes": [
    { "name": "A", "left": 100, "top": 100, "label": "A" },
    { "name": "B", "left": 400, "top": 100, "label": "B" }
  ],
  "arrows": [
    { "name": "f", "from": "A", "to": "B", "label": "$F(f)$", "curve": -90 },
    { "name": "g", "from": "A", "to": "B", "label": "$G(f)$", "curve": 90 },
    { "name": "eta", "from": "f", "to": "g", "label": "$\\eta$", "style": { "head": { "name": "epi" } } }
  ]
}
```

## Future Work

-   **Editor Enhancements**:
    -   [ ] Add undo/redo functionality.
    -   [ ] Implement multi-selection for moving and deleting multiple elements at once.
    -   [ ] Allow direct text editing of labels on the canvas.
-   **Styling and Features**:
    -   [ ] Expand arrow/node styles to better match `q.uiver.app` (e.g., different node shapes).
    -   [ ] Support more `q.uiver.app` features like cell coloring.
-   **Performance**:
    -   [ ] Optimize rendering for very large diagrams.
