# Arrowgram Architecture & Implementation

## 1. High-Level Design
Arrowgram is designed as a **hybrid architecture** splitting core logic from the presentation layer. This allows the rendering engine to be used in diverse contexts (web app, server-side generation, CLI tools) while the web app focuses on user interaction.

**Important:** The core data model is defined in `packages/arrowgram/src/types.ts`. Any changes to this schema must be synchronized with the authoritative reference in `docs/ARROWGRAM_SPEC.md`.

## 2. Core Library (`@hotdocx/arrowgram`)
**Location:** `packages/arrowgram`

### 2.1. Responsibilities
*   **Data Model:** Defines strict structural `DiagramSpec` schemas in `src/types.ts` and semantic graph/identity/limit validation in `src/schema`. Together these are the executable source of truth.
*   **Geometry Engine:** Pure mathematical functions (`src/core/curve.ts`, `src/core/arrow.ts`) for calculating Bézier curves, intersections, and layout.
    *   **Provenance:** Substantial geometry/rendering algorithms are adapted from the MIT-licensed `varkor/quiver` project and ported/modified in TypeScript. See `packages/arrowgram/THIRD_PARTY_NOTICES.md` and `reports/ARROWGRAM_CORE_PROVENANCE_2026-08-30.md`.
*   **Rendering:** A functional React renderer (`src/react/ArrowGramDiagram.tsx`) that transforms the computed model into SVG elements.
    *   **Editor-state independent:** The renderer takes a computed diagram and render props; React `useId` scopes effects and an optional callback reports KaTeX diagnostics.
    *   **Labels/accessibility:** A shared tokenizer/layout model drives geometry and mixed text/KaTeX markup; rendering preserves MathML, scopes effect IDs per instance, and exposes title/description/decorative/text-summary contracts.

### 2.2. Key Concepts
*   **`Arrow` Class (`src/core/arrow.ts`):** Handles the complex logic of arrow path generation, including:
    *   **Shapes:** Bezier curves and Arcs.
    *   **Decorations:** Heads (epi, hook), Tails (mono, maps_to), Bodies (squiggly, barred, bullets).
    *   **Modes:** Adjunctions, Pullbacks.
    *   **Layout:** Label positioning, Shortening (gaps), Masking for 2-cells.
    *   **Geometry contract:** Shift-aware endpoint refinement, visible-subcurve rendering, bounded shortening diagnostics, and visual bounds used by the diagram viewBox.
    *   **Masks:** Geometry stores local effect keys and bounds; the React instance assigns collision-free DOM IDs during render.
*   **`parseDiagramSpec` / `computeDiagramResult`:** The primary failure-honest entry points. They return discriminated results with stable structural, semantic, geometry, legacy, label, and rendering diagnostics.
*   **`computeDiagram` (`src/core/diagramModel.ts`):** A compatibility facade that maps failed results to a non-null `ComputedDiagram.error`. New consumers should use `computeDiagramResult`.
*   **Dependency planning:** Named higher-order arrows are validated before geometry and computed in deterministic topological order while retaining their original `sourceIndex` for persistence/editor operations.

## 3. Web Application (`@hotdocx/arrowgram-web`)
**Location:** `packages/web`

### 3.1. Tech Stack
*   **Framework:** React 19 + Vite
*   **State Management:** `zustand` (global store) + `zundo` (undo/redo history).
*   **Styling:** Tailwind CSS + Radix UI (primitives).
*   **Export:** `pagedjs` (PDF), `save-svg-as-png`.

### 3.2. State Architecture
*   **`diagramStore`:** Holds the current `DiagramSpec` string, selection state, and filename.
*   **Interactions:** The `ArrowGramEditor` component handles mouse/pointer events (pan, zoom, drag) and translates them into updates to the `diagramStore`.
*   **Property Editing:** The `PropertyEditor` component allows granular control over all spec properties (colors, styles, geometry).

### 3.3. AI Integration
*   **Gemini API:** Integrated directly into the frontend (via `src/components/AIChatPanel.tsx`).
*   **Workflow:** User request -> LLM generates JSON -> JSON merged/replaced in Store -> UI updates.

## 4. Package Boundaries

*   **`packages/arrowgram`:** Core schema, geometry, computed model, and React SVG renderer. This package should stay usable without the SaaS host.
*   **`packages/web`:** OSS editor/workspace UI, paper/preview pipelines, adapters, AI/BYOK mode, local persistence, and embeddable workspace exports.
*   **`packages/paged`:** Paged.js viewer/prototype package for paper-style rendering.
*   **`packages/agent`:** File-backed bridge/runtime for agent-friendly Arrowgram editing and static output.
*   **`packages/lastrevision`:** Private SaaS host/runtime for remote persistence, auth, uploads, AI proxying, gallery/publications, reference IDs, subscriptions, and deployment-specific wiring.

### 4.1 Core package export graph

`@hotdocx/arrowgram` is built as four explicit ESM/CJS entry graphs:

- `@hotdocx/arrowgram/schema`: Zod schemas, structural/semantic validation, normalization, diagnostics, limits, dependency planning, and JSON Schema generation.
- `@hotdocx/arrowgram/core`: schema plus geometry/computation, label layout, bounds, and editor transforms.
- `@hotdocx/arrowgram/react`: React/KaTeX SVG rendering.
- `@hotdocx/arrowgram`: convenience facade over all supported APIs.

Schema/core graphs externalize and reach only declared Zod; they do not import React, ReactDOM, KaTeX, or DOM globals. React, ReactDOM, and KaTeX are optional peers so headless installs stay headless. The exact-tarball verifier enforces export targets, reachable declaration/JavaScript dependencies, NodeNext types, ESM/CJS, React 18/19 SSR, browser bundling, notices, and size budgets.

## 5. Cross-Reference

*   **API Spec:** See `docs/ARROWGRAM_SPEC.md` for the JSON schema used by AI agents.
*   **Editor/package status:** See `reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md`.
*   **SaaS product status:** See `reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md`.
*   **Operations/testing/deployment status:** See `reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md`.
*   **Historical reports:** Retired reports are archived under `.scratchpad/reports-archive-2026-07-08/`; search them only when current docs/code are ambiguous.
