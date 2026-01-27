# Arrowgram Architecture & Implementation

## 1. High-Level Design
Arrowgram is designed as a **hybrid architecture** splitting core logic from the presentation layer. This allows the rendering engine to be used in diverse contexts (web app, server-side generation, CLI tools) while the web app focuses on user interaction.

**Important:** The core data model is defined in `packages/arrowgram/src/types.ts`. Any changes to this schema must be synchronized with the authoritative reference in `docs/ARROWGRAM_SPEC.md`.

## 2. Core Library (`@arrowgram/core`)
**Location:** `packages/arrowgram`

### 2.1. Responsibilities
*   **Data Model:** Defines the `DiagramSpec` using Zod schemas (`src/types.ts`). This is the "source of truth".
*   **Geometry Engine:** Pure mathematical functions (`src/core/curve.ts`, `src/core/arrow.ts`) for calculating Bézier curves, intersections, and layout.
    *   *Inspiration:* Heavily influenced by `q.uiver.app`'s geometry logic (ported to TypeScript).
*   **Rendering:** A functional React renderer (`src/react/ArrowGramDiagram.tsx`) that transforms the computed model into SVG elements.
    *   **Stateless:** The renderer is pure; it takes props and returns SVG.

### 2.2. Key Concepts
*   **`Arrow` Class (`src/core/arrow.ts`):** Handles the complex logic of arrow path generation, including:
    *   **Shapes:** Bezier curves and Arcs.
    *   **Decorations:** Heads (epi, hook), Tails (mono, maps_to), Bodies (squiggly, barred, bullets).
    *   **Modes:** Adjunctions, Pullbacks.
    *   **Layout:** Label positioning, Shortening (gaps), Masking for 2-cells.
*   **`computeDiagram` (`src/core/diagramModel.ts`):** The main entry point. Takes a JSON spec, computes layout/geometry, resolves dependencies (e.g. 2-cells connecting to other arrows), and outputs a `ComputedDiagram` ready for rendering.

## 3. Web Application (`@arrowgram/web`)
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

## 4. Cross-Reference
*   **API Spec:** See `packages/paged/AGENTS.md` and `docs/ARROWGRAM_SPEC.md` for the JSON schema used by AI agents.
*   **Gap Analysis:** See `reports/GAP_ANALYSIS.md` for feature parity status vs Quiver.