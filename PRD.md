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
*   **Purpose:** The "brain" and "renderer". A standalone library for definitions and rendering.
*   **Responsibilities:**
    *   **Data Model:** Zod-validated JSON schema (`DiagramSpec`).
    *   **Geometry Engine:** Pure functions calculating Bézier curves, intersection points, and label positioning.
    *   **Rendering:** React components (`<ArrowGram />`) converting the model to SVG.
    *   **Math:** KaTeX rendering for labels.
*   **Key Requirement:** Must be usable *headless* (or nearly so) for server-side generation/validation contexts.

### 3.2. `@arrowgram/web` (formerly `packages/web`)
*   **Purpose:** The "body". A full-featured Progressive Web App (PWA).
*   **Responsibilities:**
    *   **State Management:** Global store (Zustand) with robust Undo/Redo (`zundo`).
    *   **Persistence:** `IndexedDB`-based local "filesystem" for managing multiple projects.
    *   **Interaction:** Canvas manipulation (pan, zoom, drag nodes, drag connections).
    *   **AI Service:** interface to Gemini (and potentially others) for natural language diagramming.
    *   **Export Pipeline:** High-fidelity export tools.

## 4. Functional Specifications

### 4.1. The Editor Experience
*   **Projects System:**
    *   Dashboard to list, create, rename, and delete diagrams.
    *   Thumbnails for recent diagrams.
    *   "Auto-save" to local storage.
*   **Canvas Interaction:**
    *   **Nodes:** Double-click to create, Drag to move. LaTeX label editing in place or via panel.
    *   **Arrows:** Click source -> Drag -> Release on target.
    *   **Selection:** Box selection, Shift+Click multi-select.
*   **Keyboard Shortcuts (Critical for "Exceeding Quiver"):**
    *   `Enter`: Edit label of selected item.
    *   `Delete`/`Backspace`: Remove selected.
    *   `Ctrl+Z` / `Ctrl+Shift+Z`: Undo/Redo.
    *   `Shift+Drag`: Create arrow.
    *   `Alt+Drag`: Curve arrow.
*   **Visual Polish:**
    *   Modern UI components (Radix UI / Tailwind).
    *   Dark/Light mode support (diagrams adapt or lock color mode).

### 4.2. Mathematical Capabilities
*   **Arrow Types:**
    *   Standard (monomorphism, epimorphism, isomorphism).
    *   Decoration (dashed, dotted, wavy).
    *   2-cells (arrows between arrows) for natural transformations and homotopies.
    *   Loops (self-referential arrows).
*   **Labels:**
    *   Full LaTeX support via KaTeX.
    *   Intelligent positioning (auto-avoid overlapping lines).

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
*   **Reliability:** 100% test coverage on the Geometry Engine.
*   **Packaging:** `@arrowgram/core` must be tree-shakeable and typed.

## 6. Implementation Roadmap

1.  **Foundation:** Refactor `core` for strict typing and headless capabilities.
2.  **UX Polish:** Implement the "Projects" dashboard and Keyboard Shortcuts.
3.  **AI Refinement:** Implement "Merging" logic for incremental AI updates.
4.  **DevOps:** CI/CD for NPM publishing and Docker containerization.
5.  **Launch:** Deploy to GitHub Pages / Cloud Run.