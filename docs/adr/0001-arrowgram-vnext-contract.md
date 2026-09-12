# ADR 0001: Arrowgram vNext Contract

Date: 2026-08-30

Status: Accepted for implementation

Decision owners: Arrowgram maintainers

Implementation plan: `reports/PLAN_ARROWGRAM_CORE_PACKAGE_REVIEW_2026-08-30.md`

## Context

Arrowgram's public v1 surface currently has four contracts that disagree:

- Zod accepts and strips unknown fields;
- the generated JSON Schema rejects unknown fields;
- `computeDiagram` adds renderer-only identity and silently omits some invalid arrows;
- prose requires semantic invariants that are not executable.

The editor has also serialized computed `uniqueId` fields into some legacy diagram JSON. Enabling strict validation without an explicit migration path would reject documents produced by Arrowgram itself.

vNext must make AI-generated, user-edited, headless, and rendered diagrams share one failure-honest contract. Correctness takes precedence over preserving undocumented acceptance, while legacy documents receive a narrow, observable migration path.

## Decision

### 1. Version axes

- The current document format is **Arrowgram format version 1**.
- Input may omit `version`; successful canonicalization inserts `version: 1`.
- Any explicit document version other than integer `1` is rejected as unsupported.
- The document format version, npm package semver, and documentation revision are separate values and must be named distinctly.
- The implementation targets an unpublished `@hotdocx/arrowgram@2.0.0` release candidate because public schema/result/package-entry behavior changes.

### 2. Canonical versus legacy input

- Canonical schemas reject unknown keys at every object boundary.
- Canonical parsing never silently removes or rewrites user data.
- `normalizeLegacyDiagramSpec` is a separate opt-in API. It may remove only explicitly catalogued legacy residue and returns a diagnostic for every change.
- The initial legacy catalogue contains top-level arrow field `uniqueId` only. New migrations require a reviewed fixture and diagnostic code.
- Successful normalization is followed by the same strict structural and semantic validation as canonical input.
- Canonical serialization always emits `version: 1` and never emits computed/render metadata.

### 3. Identity and endpoint graph

- Node `name` values are non-empty unique logical IDs.
- Arrow `name` values, when present, are non-empty unique logical IDs.
- Nodes and named arrows share one endpoint namespace and may not collide.
- Only explicitly named arrows may be higher-order arrow endpoints.
- Unnamed arrows receive a stable computed key derived from source position for rendering/selection only. That key is never accepted as a logical endpoint and is never serialized into `ArrowSpec`.
- Computed keys, logical IDs, source indices, and DOM IDs are distinct typed fields.
- Logical IDs may not begin with the reserved `__arrowgram_internal__` namespace used by computed keys.
- Dependency validation reports all dangling endpoints and cycles before geometry. Valid dependencies are evaluated in deterministic topological order; source order is retained separately.
- The default render order is underlying cells before arrows that depend on them, with source order as the stable tie-breaker. Consumers must not correlate computed/source arrays by position alone.

### 4. Result and diagnostic contract

- The primary vNext parse/validate/compute APIs return a discriminated result:

  ```ts
  type ArrowgramResult<T> =
    | { ok: true; value: T; diagnostics: ArrowgramDiagnostic[] }
    | { ok: false; diagnostics: ArrowgramDiagnostic[] };
  ```

- Diagnostics have stable `code`, `severity`, `phase`, `message`, and JSON `path`; entity/source metadata is included when known.
- JSON syntax, structural schema, semantic graph, geometry, label, and rendering diagnostics use distinct phases/codes.
- Strict computation is all-or-nothing: no unresolved or failed arrow appears under `ok: true` without an explicit warning describing a defined fallback.
- An editor-oriented partial mode may be exposed separately. It must report every omitted/degraded entity and cannot masquerade as strict success.
- Library code does not write to `console` unless a caller explicitly supplies a logger.
- A deprecated compatibility facade may remain during migration only if it maps every failure to a non-null error and preserves diagnostics; it may not retain silent omission.

### 5. Limits and values

The canonical package defaults are intentionally generous relative to the editor's sub-100-node performance target. Hosts processing untrusted input may impose tighter limits through validation options.

| Limit | Canonical default |
|---|---:|
| Nodes | 1,000 |
| Arrows | 4,000 |
| Logical ID length | 256 Unicode code points |
| Label length | 16,384 Unicode code points |
| Color string length | 256 Unicode code points |
| Absolute coordinate | 1,000,000 px |
| Absolute curve/shift/radius/shorten | 1,000,000 px |
| Absolute angle | 1,000,000 degrees before normalization |
| Higher-order dependency depth | 128 |
| Arrow style level | integer 1–3 |

- All numbers must be finite.
- `shorten.source` and `shorten.target` are nonnegative.
- Impossible over-shortening is clamped to the available visible path and produces a `geometry.shorten_clamped` warning; it never emits a negative SVG value.
- Node and arrow colors remain CSS color strings for vNext compatibility, but URL/resource-bearing paint values are rejected. Host renderers may restrict colors further.
- Aggregate budgets and the limits above are enforced before expensive geometry or label rendering.

### 6. Geometry behavior

- The shared implicit node endpoint radius remains 25 px until label-aware shapes replace it deliberately.
- A self-loop with omitted `radius` uses 40 px, matching current editor creation and transform assumptions.
- A zero loop radius is invalid. Negative radii remain valid because current transforms use the sign to reverse loop direction; magnitude must be positive and within limits.
- Distinct endpoints at the same coordinates produce a structured geometry error in strict mode rather than a silent omission.
- Overlapping endpoint shapes and curves without a positive visible span produce a structured geometry error unless a specifically documented fallback is implemented and warned.
- Endpoint clipping is calculated against the actual shifted curve.
- Every accepted strict result contains only finite SVG coordinates and nonnegative widths/dash components.
- Computed bounds include nodes, complete curves/arcs, strokes, heads, tails, body decorations, labels, and masks.

### 7. Labels and accessibility

- Plain text is first-class and requires no delimiters.
- `$...$` denotes inline math. `\$` denotes a literal dollar.
- Mixed text and inline-math spans are supported only through a real tokenizer; renderer behavior must never be selected by `includes('$')` followed by deleting all dollar signs.
- Unterminated or malformed delimiters produce label diagnostics.
- Rotation units are explicit in field names. SVG-facing rotation uses degrees.
- Geometry and React rendering consume one label layout model.
- KaTeX diagnostics are observable; styles are emitted once per rendering surface, not once per label.
- Accessible math is preserved or replaced by an equivalent semantic label.
- React SVG consumers can provide a title, description, decorative mode, and structured text summary.

### 8. DOM identity and rendering

- Headless computation is independent of DOM IDs.
- Masks/effects use local computed effect keys. The React rendering instance converts those keys to canonicalized instance-scoped DOM IDs.
- Direct low-level rendering, repeated diagrams, SSR, and hydration must be collision-free without requiring logical IDs to be valid CSS/SVG fragment identifiers.
- Mask coverage derives from computed bounds rather than a fixed global rectangle.

### 9. Package boundaries

- `@hotdocx/arrowgram/schema` exposes format types, schemas, normalization, and validation without React, ReactDOM, KaTeX, or a DOM.
- `@hotdocx/arrowgram/core` exposes validation, computation, diagnostics, and editor transforms without React, ReactDOM, KaTeX, or a DOM.
- `@hotdocx/arrowgram/react` exposes the React/KaTeX renderer.
- The package root remains a compatibility/convenience facade.
- Zod is a declared external runtime dependency because public schema values and declarations expose it.
- Exact-tarball tests prove ESM/CJS, TypeScript resolution, browser bundling, schema import, React 18/19 SSR, and hydration.

### 10. Release and operational effects

- Local and CI checks may build an unpublished release-candidate tarball.
- npm publication, OSS synchronization, Pages deployment, and SaaS deployment are separate effects and are not authorized by this ADR or implementation goal.
- Release-candidate evidence must identify the exact source commit and tarball digest.

## Consequences

### Positive

- Runtime, machine schema, prose, editor, and agent behavior can share one fixture corpus.
- Invalid mathematical content cannot disappear under a successful result.
- Legacy Arrowgram-produced residue has an explicit recovery path.
- Headless consumers avoid React and KaTeX.
- Geometry and rendering changes become testable through stable diagnostics and invariants.

### Costs and compatibility

- Strict unknown-key rejection and result types are public breaking changes.
- All monorepo consumers must migrate together before the release candidate is complete.
- Existing documents containing `uniqueId` need normalization on load/save boundaries.
- Bounds, label, and geometry fixes may intentionally change approved visual output.
- The package will add fixture, property, browser, consumer, and benchmark maintenance work.

## Rejected alternatives

### Keep Zod's stripping behavior and loosen JSON Schema

Rejected because it silently loses misspelled AI/user data and does not satisfy the strict API promise.

### Make `uniqueId` part of `ArrowSpec`

Rejected because it is renderer state, index-derived for unnamed arrows, and unsafe as a portable logical identity.

### Keep returning partial diagrams with a nullable string error

Rejected because consumers already treat failed empty results as success and cannot distinguish phases or entities.

### Require every arrow to be named

Rejected for vNext because ordinary one-cell arrows do not need portable identities. Explicit names are required only when another arrow references them.

### Make DOM IDs during geometry computation

Rejected because it couples headless deterministic computation to rendering-instance state and causes repeated-diagram collisions.

## Verification

This ADR is implemented only when every phase exit gate in the linked plan passes and the canonical fixtures prove equivalent **structural** runtime/JSON-Schema decisions, explicitly annotated runtime-only semantic decisions, failure-honest graph/geometry behavior, collision-free rendering, clean headless imports, and exact packed-consumer compatibility.
