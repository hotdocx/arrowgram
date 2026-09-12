# Arrowgram vNext Compatibility Matrix

Date: 2026-08-30

Status: Release-candidate workspace; exact core RC published under npm dist-tags `latest` and `next`

## Candidate cohort

| Surface | Workspace version/range | Verified contract |
|---|---|---|
| `@hotdocx/arrowgram` | `2.0.0-rc.0` (`latest`, `next`) | Node 20.19/22/24 target; ESM/CJS/NodeNext; DOM-free schema/core; React 18/19 SSR/hydration/browser |
| `@hotdocx/arrowgram-web` | workspace `1.1.3`, core range `^2.0.0-0` | Jest, library/app builds, Chromium E2E, mixed labels, strict/legacy diagnostics |
| `@hotdocx/arrowgram-agent` | workspace `0.1.6`, core range `^2.0.0-0`, web range `^1.1.1` | build/unit, local cohort packed install, browser bridge, static Paged/Reveal output |
| `arrowgram-paged` | workspace `0.0.1`, core range `*` | canonical validation and production build |
| LastRevision private host | local web workspace | production/SPA build with dummy CI configuration |

Workspace version numbers other than core are intentionally not published or retagged by
this implementation goal. Their next semver versions must be selected in the separately
authorized coordinated release, based on their own public API review.

## Runtime and compiler matrix

| Consumer | Result |
|---|---|
| Node 20.19 | CI matrix target; package engine floor |
| Node 22 | monorepo/LastRevision supported baseline and CI default |
| Node 24 | local review and CI matrix target |
| TypeScript 5.9 NodeNext | exact packed headless and React consumers pass |
| ESM | exact packed schema/core/React consumers pass |
| CommonJS | exact packed schema/core/React consumers pass |
| React 18.3.1 | exact packed SSR, hydration, typecheck, and browser bundle pass |
| React 19.2.8 | exact packed SSR, hydration, typecheck, and browser bundle pass |
| Chromium | web visual/accessibility/editor suite passes |

## Stable published plugin versus candidate workspace

The public Arrowgram Codex plugin remains pinned to
`@hotdocx/arrowgram-agent@0.1.6`, the currently published stable agent cohort. Publishing the
core RC does not make an unpublished web/agent workspace cohort available to the plugin.
After web/agent artifacts are separately approved and published, update the plugin pin,
cachebuster, SOP, and installed-cache equality in one reviewed compatibility checkpoint.

## Migration boundary

Core v2 is semver-major because strictness, result handling, computed identity, path data,
package entries, dependency ownership, and label/render semantics change. See
`packages/arrowgram/CHANGELOG.md` and `docs/ARROWGRAM_VNEXT_API.md`.

The document format remains version 1. Package semver is not a document-format version.

## Release constraints

- The implementation goal stopped before publication. Separately authorized 2026-09-01
  steps published only the exact core RC and assigned `latest` plus `next`; see
  `reports/ARROWGRAM_VNEXT_NPM_PUBLICATION_2026-09-01.md`.
- No OSS sync, Pages deploy, plugin pin, or SaaS deploy occurred.
- Exact candidate tarball/SBOM/verification files live under ignored `output/`.
- A future coordinated stable release must use newly reviewed exact core bytes, then
  compatible web/agent artifacts, and only then update plugin pins.
