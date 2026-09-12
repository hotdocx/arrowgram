# `@hotdocx/arrowgram`

React and headless utilities for rendering commutative diagrams from a strict JSON spec.

## Install

```bash
npm install @hotdocx/arrowgram
```

Headless `@hotdocx/arrowgram/schema` and `@hotdocx/arrowgram/core` consumers need no
React or KaTeX packages. React rendering consumers should install the optional peers:

```bash
npm install @hotdocx/arrowgram react react-dom katex
```

Also load KaTeX CSS when rendering math labels in the browser:

```ts
import "katex/dist/katex.min.css";
```

## Usage

```tsx
import {
  parseDiagramSpec,
} from "@hotdocx/arrowgram/schema";
import { computeDiagramResult } from "@hotdocx/arrowgram/core";
import { ArrowGram } from "@hotdocx/arrowgram/react";

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
  return (
    <ArrowGram
      spec={JSON.stringify(spec)}
      title="A morphism from A to B"
      description="Two objects connected by the morphism f"
    />
  );
}

const parsed = parseDiagramSpec(spec);
if (!parsed.ok) throw new Error(parsed.diagnostics[0]?.message);

const computed = computeDiagramResult(parsed.value);
if (!computed.ok) throw new Error(computed.diagnostics[0]?.message);
console.log(computed.value.viewBox);
```

## Schema

- Source of truth: `DiagramSpecSchema`
- Published JSON Schema: `@hotdocx/arrowgram/arrowgram.schema.json`
- Reference spec: <https://github.com/hotdocx/arrowgram/blob/main/docs/ARROWGRAM_SPEC.md>

JSON note: LaTeX backslashes must be escaped inside JSON strings, for example `"$\\to$"`.

## API

- `@hotdocx/arrowgram/schema`: strict schemas, structural/semantic validation, legacy
  normalization, diagnostics, limits, dependency planning, and JSON Schema generation.
- `@hotdocx/arrowgram/core`: the schema API plus failure-honest diagram computation,
  label layout, bounds, and editor transforms. It has no React/KaTeX/DOM runtime imports.
- `@hotdocx/arrowgram/react`: `ArrowGram` and lower-level `ArrowGramDiagram` React SVG
  renderers.
- `@hotdocx/arrowgram`: convenience facade re-exporting all supported APIs.
- `@hotdocx/arrowgram/arrowgram.schema.json`: published structural Draft 2020-12 schema.

Canonical parsing rejects unknown fields. Older editor documents containing renderer-only
`uniqueId` fields can be loaded explicitly with
`parseDiagramSpec(input, { normalizeLegacy: true })`; every removed field is reported as a
warning.

Labels support plain text and mixed inline math such as `"map $f$ at $x$"`; use `\$` for a
literal dollar. KaTeX MathML remains in the rendered output. `ArrowGram` accepts `title`,
`description`, `decorative`, and `onDiagnostic` accessibility/diagnostic props. Lower-level
`ArrowGramDiagram` rendering scopes masks per React instance automatically.

## Repository

- OSS repo: <https://github.com/hotdocx/arrowgram>
- Hosted editor: <https://hotdocx.github.io/arrowgram>

## Acknowledgements

Arrowgram's geometry and arrow-rendering engine adapts portions of
[varkor/quiver](https://github.com/varkor/quiver), used under the MIT License. The npm
package includes the upstream copyright/license notice and a detailed adaptation map in
`THIRD_PARTY_NOTICES.md`.
