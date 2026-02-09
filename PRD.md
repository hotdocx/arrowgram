# Arrowgram Product Requirements Document (PRD)

## 1. Executive Summary

**Product Name:** Arrowgram  
**Mission:** To be the premier tool for creating, editing, and sharing commutative diagrams for Category Theory and related mathematics.  
**Vision:** A "production-grade" platform that serves both human researchers and AI agents. It must exceed the capabilities of existing tools like `q.uiver.app` in terms of usability, aesthetic quality, and integration with modern AI workflows.

**Target Audience:**
1.  **Researchers & Students:** Who need beautiful diagrams for papers (LaTeX/TikZ export) and slides.
2.  **AI Coding Agents:** Who need a programmatic way to generate and verify diagrams as part of a reasoning pipeline.
3.  **Developers:** Who want to embed interactive diagrams in web applications.

## 2. Competitive Analysis (vs q.uiver.app)

| Feature | Quiver (Current Standard) | Arrowgram (Goal) |
| :--- | :--- | :--- |
| **Interface** | Functional, tool-based | Modern, sleek, keyboard-centric (Vim-like speed) |
| **AI Integration** | None | Native LLM chat for creation & *incremental* modification |
| **Export** | LaTeX, Image | LaTeX, Image, PDF (Paged.js), JSON, React Component |
| **Architecture** | Client-side only | Hybrid (Client-first + Optional Cloud features) |
| **Programmatic API** | N/A | First-class NPM package for agents |

## 3. Product Architecture

The project is a monorepo with two primary packages:

### 3.1. `@arrowgram/core` (formerly `packages/arrowgram`)
*   **Status:** Implemented & Tested.
*   **Purpose:** The "brain" and "renderer". A standalone library for definitions and rendering.
*   **Tech:** TypeScript, Zod, Vitest.
*   **Responsibilities:**
    *   **Data Model:** Zod-validated JSON schema (`DiagramSpec`).
    *   **Geometry Engine:** Pure functions calculating Bézier curves, intersection points, and label positioning.
    *   **Rendering:** React components (`<ArrowGram />`) converting the model to SVG.
    *   **Math:** KaTeX rendering for labels.
*   **Key Requirement:** Usable *headless* (or nearly so) for server-side generation/validation contexts.

### 3.2. `@arrowgram/web` (formerly `packages/web`)
*   **Status:** Implemented (Beta).
*   **Purpose:** The "body". A full-featured Progressive Web App (PWA).
*   **Tech:** React, Vite, Tailwind, Zustand, Zundo, Paged.js, Reveal.js, Jest.
*   **Responsibilities:**
    *   **State Management:** Global store (Zustand) with robust Undo/Redo (`zundo`).
    *   **Persistence:** `IndexedDB`-based local "filesystem" for managing multiple projects.
    *   **Interaction:** Canvas manipulation (pan, zoom, drag nodes, drag connections).
    *   **AI Service:** interface to Gemini (and potentially others) for natural language diagramming.
*   **Export Pipeline:** High-fidelity export tools, including PDF generation via Paged.js (paged articles) and Reveal.js print-to-PDF (slides).

### 3.3. `packages/lastrevision` (private SaaS runtime)
*   **Status:** Implemented (private super-repo only).
*   **Purpose:** A SaaS host/runtime for Arrowgram that adds auth + remote persistence + uploads + AI proxy, while embedding the same workspace/editor UI from `@arrowgram/web`.
*   **Hosting model:** Split-hosting (static SPA on GitHub Pages + API on Cloud Run).
*   **Auth model:** Bearer tokens (no third-party cookies) for reliability across origins.
*   **Uploads:** Presigned direct-to-object-store uploads (GCS preferred; R2 fallback).
*   **Validation:** End-to-end validation scripts exist for both local and deployed environments:
    *   `scripts/validate_lastrevision_local.sh`
    *   `CLOUD_RUN_URL=https://<service>.run.app scripts/validate_lastrevision_remote.sh`

### 3.4 Community Gallery (SaaS Only)
*   **Publishing**: Users can publish snapshots of their Diagrams or Papers.
*   **Metadata**: Includes Title, Description, Event Date, and Tags.
*   **Visuals**: Automatically generated screenshots (PNG).
*   **Public Access**: Read-only gallery viewable by anyone.

## 4. Technical Architecture

### 4.1. The Editor Experience (End-User UI/UX)
*   **Projects System:**
    *   Dashboard to list, create, rename, and delete diagrams.
    *   Thumbnails for recent diagrams.
    *   "Auto-save" to local storage.
*   **Canvas Interaction:**
    *   **Nodes:** Double-click to create, Drag to move. LaTeX label editing in place or via panel.
    *   **Arrows:** Click source -> Drag -> Release on target.
    *   **Selection:** Box selection, Shift+Click multi-select.
    *   **Pan/Zoom:** Mouse wheel to zoom, Middle-click or Space+Drag to pan.
*   **Toolbar & Manipulations:**
    *   **Undo/Redo:** `Ctrl+Z` / `Ctrl+Shift+Z`.
    *   **Delete:** `Backspace`/`Delete`.
    *   **Flip Arrow:** Reverses the curvature (but not direction) or angle.
    *   **Reverse Arrow:** Swaps source and target nodes (reverses direction).
    *   **Fit to Screen:** Automatically centers and zooms the diagram to fit the viewport.
    *   **Rotate/Flip Nodes:** Select multiple nodes to rotate them around the center or flip horizontally/vertically.
*   **Visual Polish:**
    *   Modern UI components (Radix UI / Tailwind).
    *   Dark/Light mode support (diagrams adapt or lock color mode).

### 4.2. Mathematical Capabilities
*   **Arrow Types:**
    *   Standard (monomorphism, epimorphism, isomorphism).
    *   Decoration (dashed, dotted, wavy, barred, bullets).
    *   2-cells (arrows between arrows) for natural transformations and homotopies.
    *   Loops (self-referential arrows).
    *   Pullback/Pushout corner markers.
    *   Adjunction turnstiles.
*   **Labels:**
    *   Full LaTeX support via KaTeX.
    *   Intelligent positioning (auto-avoid overlapping lines).
    *   Alignment options (Over, Left, Right).
*   **Styling:**
    *   Color support for nodes, arrows, and labels.
    *   Line shortening (gaps at endpoints).

### 4.3. AI "Co-Pilot"
*   **Chat Interface:** A side-panel for natural language interaction.
*   **Incremental Updates:** "Add a pullback square to node A" should *add* to the existing diagram, not replace it.
*   **Context Awareness:** The AI knows the current IDs and labels of nodes to connect them correctly.

### 4.4. Export & Integration
*   **TikZ-CD:** Production of clean, idiomatic LaTeX code for paper inclusion.
*   **Images:** High-res PNG (handling specific `foreignObject` constraints).
*   **JSON:** The raw `ArrowgramSpec` for portability.

## 5. Non-Functional Requirements

*   **Performance:** 60fps rendering for diagrams with <100 nodes.
*   **Accessibility:** Keyboard navigation for the graph structure.
*   **Reliability:** CI setup runs `vitest` for core and `jest` for web.
*   **Packaging:** `@arrowgram/core` must be tree-shakeable and typed.

## 6. Implementation Roadmap

1.  **Foundation:** Refactor `core` for strict typing and headless capabilities. [COMPLETE]
2.  **UX Polish:** Implement the "Projects" dashboard and Keyboard Shortcuts. [IN PROGRESS]
3.  **AI Refinement:** Implement "Merging" logic for incremental AI updates. [IN PROGRESS]
4.  **DevOps:** CI/CD for NPM publishing and Docker containerization. [PARTIAL - CI Active]
5.  **Launch:** Deploy to GitHub Pages / Cloud Run.

## 7. Reference Material

The following directories in the codebase serve as reference and inspiration:
-   `tmp-quiver-codebase/`: A snapshot of the `q.uiver.app` codebase. Useful for understanding complex geometry logic (intersections, bezier curves).
-   `tmp-arrowgram-original/`: An earlier version of this project.
-   `tmp-arrowgram_paged/`: Prototypes for the paged/paper feature.
-   `reports/QUIVER_INSPIRATION.md`: Detailed analysis of the Quiver architecture.
-   `reports/PLAN_REVEAL_JS_TEMPLATE.md`: Reveal.js slide template plan (master template + per-paper CSS side-artifact).
