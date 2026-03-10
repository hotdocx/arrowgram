# `@hotdocx/arrowgram`

React and headless utilities for rendering commutative diagrams from a strict JSON spec.

## Install

```bash
npm install @hotdocx/arrowgram
```

If you render LaTeX labels in the browser, also load KaTeX CSS:

```ts
import "katex/dist/katex.min.css";
```

## Usage

```tsx
import { ArrowGram, computeDiagram } from "@hotdocx/arrowgram";

const spec = {
  version: 1,
  nodes: [
    { name: "A", left: 100, top: 100, label: "$A$" },
    { name: "B", left: 300, top: 100, label: "$B$" }
  ],
  arrows: [
    { from: "A", to: "B", label: "$f$" }
  ]
};

export function DiagramExample() {
  return <ArrowGram spec={JSON.stringify(spec)} />;
}

const diagram = computeDiagram(spec);
console.log(diagram.viewBox);
```

## Schema

- Source of truth: `DiagramSpecSchema`
- Published JSON Schema: `@hotdocx/arrowgram/arrowgram.schema.json`
- Reference spec: <https://github.com/hotdocx/arrowgram/blob/main/docs/ARROWGRAM_SPEC.md>

JSON note: LaTeX backslashes must be escaped inside JSON strings, for example `"$\\to$"`.

## API

- `ArrowGram`: React SVG renderer for a JSON string spec
- `ArrowGramDiagram`: lower-level renderer for a computed diagram
- `computeDiagram`: parses and computes a `DiagramSpec`
- `DiagramSpecSchema`: Zod schema for validation and tooling

## Repository

- OSS repo: <https://github.com/hotdocx/arrowgram>
- Hosted editor: <https://hotdocx.github.io/arrowgram>
