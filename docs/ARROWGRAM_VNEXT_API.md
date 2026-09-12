# Arrowgram vNext Public API

Date: 2026-08-30

Candidate package: `@hotdocx/arrowgram@2.0.0-rc.0` (published under npm dist-tags `latest` and `next`)

Install the current default, use the prerelease alias, or pin the exact reviewed version:

```bash
npm install @hotdocx/arrowgram
npm install @hotdocx/arrowgram@next
npm install @hotdocx/arrowgram@2.0.0-rc.0
```

`^2.0.0-0` resolves this RC; `^1.0.0` remains on the v1 line.

## Entry points

### `@hotdocx/arrowgram/schema`

DOM-free structural and semantic contract:

- schemas/types: `NodeSchema`, `ArrowSchema`, `ArrowStyleSchema`,
  `DiagramSpecSchema`, `DiagramSpec`, `CanonicalDiagramSpec`;
- parsing: `parseDiagramSpec`, `validateDiagramSpec`;
- migration: `normalizeLegacyDiagramSpec`;
- diagnostics: `ArrowgramResult`, `ArrowgramDiagnostic`, `firstErrorMessage`;
- graph/identity: `buildArrowDependencyPlan`, `computedArrowKey`;
- limits: `ARROWGRAM_LIMITS`;
- JSON Schema: `createDiagramSpecJsonSchema`, `ARROWGRAM_JSON_SCHEMA_ID`.

This graph has one runtime dependency, Zod, and no React, KaTeX, or DOM globals.

### `@hotdocx/arrowgram/core`

Everything in `schema`, plus:

- `computeDiagramResult` (primary strict API);
- `computeDiagram` (deprecated compatibility facade);
- computed diagram/arrow/bounds/label/mask types;
- `createLabelLayout`, `diagramTextSummary`, label estimators;
- `reverseArrow`, `flipArrow`, `rotateNodes`, `flipNodes`, `selectConnected`.

This graph remains DOM-free and has no React or KaTeX runtime import.

### `@hotdocx/arrowgram/react`

- `ArrowGram`: complete SVG component from a JSON string;
- `ArrowGramDiagram`: lower-level renderer for `ComputedDiagram`;
- accessibility/render props and diagnostic callback types.

React, ReactDOM, and KaTeX are optional peers. Install them explicitly when using this
entry point and load KaTeX CSS in browser surfaces.

### `@hotdocx/arrowgram`

Convenience facade re-exporting all supported APIs. Headless consumers should prefer the
narrower entries so dependency intent remains explicit.

### `@hotdocx/arrowgram/arrowgram.schema.json`

Draft 2020-12 **structural** schema. Standard JSON Schema cannot express identity
uniqueness by property, endpoint resolution, graph cycles, dependency depth, or loop
cross-field rules; the schema carries explicit metadata directing callers to
`parseDiagramSpec` for those semantics.

## Result and diagnostic contract

```ts
type ArrowgramResult<T> =
  | { ok: true; value: T; diagnostics: ArrowgramDiagnostic[] }
  | { ok: false; diagnostics: ArrowgramDiagnostic[] };
```

Diagnostics have stable code, severity, phase, JSON path, and optional entity/source
metadata. Current phases are `json`, `structural`, `semantic`, `geometry`, `label`,
`render`, and `legacy`.

`ok: true` may contain warnings such as `legacy.unique_id_removed` or
`geometry.shorten_clamped`. Fatal content is never silently omitted from a strict success.

## Canonical validation flow

```ts
import { parseDiagramSpec } from '@hotdocx/arrowgram/schema';
import { computeDiagramResult } from '@hotdocx/arrowgram/core';

const parsed = parseDiagramSpec(input);
if (!parsed.ok) return parsed.diagnostics;

const computed = computeDiagramResult(parsed.value);
if (!computed.ok) return computed.diagnostics;

return computed.value;
```

Legacy editor JSON requires explicit normalization:

```ts
const parsed = parseDiagramSpec(input, { normalizeLegacy: true });
```

Only catalogued `uniqueId` residue is removed; warnings list every change and other unknown
keys remain fatal.

## Rendering contract

- mixed plain text and `$...$` math share one tokenizer/layout model;
- `\$` represents a literal dollar;
- malformed delimiters are computation errors;
- invalid KaTeX has visible fallback markup and callback diagnostics;
- MathML remains in output;
- title, description, decorative mode, and deterministic text summary are available;
- local mask keys become collision-free `useId`-scoped DOM IDs;
- computed bounds include geometry, decorations, strokes, and label layout.
- computed arrow `interactionPath` values cover only visible geometry, so editor hit targets
  do not extend through endpoint nodes.

## Compatibility facade

`computeDiagram` remains available so existing call sites receive a `ComputedDiagram` with
nullable `error`; internally it delegates to the strict result API and returns no partial
content on failure. New code should use `computeDiagramResult` so TypeScript requires
explicit failure handling.
