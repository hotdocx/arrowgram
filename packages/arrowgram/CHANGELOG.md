# Changelog

All notable changes to `@hotdocx/arrowgram` are documented here. The package follows
semantic versioning; Arrowgram document-format versioning is separate.

## 2.0.0-rc.0 — Unpublished release candidate

### Breaking

- Canonical Zod schemas are strict and accept only Arrowgram format version 1.
- Unknown fields, ambiguous identities, dangling/synthetic endpoints, cycles, invalid
  levels/ranges, and unsafe paint values are rejected with structured diagnostics.
- `computeDiagramResult` is the primary failure-honest API; `computeDiagram` remains a
  deprecated compatibility facade and no longer silently omits invalid arrows.
- Computed arrow keys are internal/source-index based and never equal portable logical IDs.
- Arrow bodies and editor interaction paths contain the visible subcurve rather than a
  centre-to-centre path hidden by generated dash arrays.
- Package entry files and CommonJS names changed to explicit root/schema/core/react exports.
- Zod is a runtime dependency; React, ReactDOM, and KaTeX are optional peers.
- Supported Node runtime for the package is Node 20.19 or newer.

### Added

- `@hotdocx/arrowgram/schema`, `@hotdocx/arrowgram/core`, and
  `@hotdocx/arrowgram/react` subpath exports.
- Structural plus semantic validation, stable diagnostics, explicit legacy `uniqueId`
  normalization, dependency planning, limits, and public JSON Schema generation.
- Shift-aware exact endpoint refinement, shortening warnings, partial Bézier/arc rendering,
  analytic bounds, and explicit visible endpoints.
- Mixed plain-text/inline-math labels, label diagnostics, visible KaTeX fallback, retained
  MathML, accessible summaries, decorative mode, and instance-scoped dynamic masks.
- Exact-tarball ESM/CJS/NodeNext/React 18/React 19 SSR/hydration/browser verification,
  package budgets, production audits, CycloneDX SBOM generation, property tests, coverage
  thresholds, and performance regression budgets.
- quiver provenance record and packaged third-party MIT notice.

### Migration

- Import validation from `@hotdocx/arrowgram/schema`, headless computation from
  `@hotdocx/arrowgram/core`, and rendering from `@hotdocx/arrowgram/react`.
- Handle `{ ok: false, diagnostics }` from `parseDiagramSpec` and `computeDiagramResult`.
- Load old editor JSON with `parseDiagramSpec(input, { normalizeLegacy: true })`, inspect
  warnings, then serialize the canonical value. Unrelated unknown keys remain errors.
- Install `react`, `react-dom`, and `katex` explicitly for rendering consumers.

## 1.0.0 — 2026-03-10

- First public package release with root ESM/UMD, declarations, React rendering, geometry,
  Zod schemas, and generated JSON Schema.
