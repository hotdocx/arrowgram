# SOP: Contributing and Architecture Guide

## 1. Architecture Overview

### 1.1 Monorepo Structure
Arrowgram is a monorepo managed by NPM Workspaces.
-   `packages/arrowgram`: **Core Library**. Pure logic and React rendering components. Zero UI dependencies (buttons, inputs).
-   `packages/web`: **Web Application**. The editor UI, built with React, Vite, Tailwind CSS, and Zustand.

### 1.2 The "Kernel" (`packages/arrowgram`)
The heart of the system is the **Diagram Model**.
-   **`src/core/diagramModel.ts`**: Takes a JSON spec and computes the geometry (lines, curves, control points).
-   **`src/core/ds.ts`**: Pure 2D vector math helpers (`Point`, `Vec2`). **All** geometric calculations must use these helpers.
-   **`src/core/arrow.ts`**: Contains the heavy lifting for arrow path generation and decoration logic.
-   **`src/ArrowGram.tsx`**: A "dumb" renderer. It takes the computed model and spits out SVG elements.

### 1.3 State Management (`packages/web`)
We use **Zustand** for state, with **Zundo** for undo/redo.
-   **Store**: `packages/web/src/store/diagramStore.ts`.
-   **Persistence**: `idb-keyval` saves projects to IndexedDB.

## 2. Standard Operating Procedures (SOPs)

### 2.1 Adding a New Arrow Style
1.  **Update Schema**: 
    -   Add the new style option to `packages/arrowgram/src/types.ts` (Zod schema).
    -   Update `docs/ARROWGRAM_SPEC.md` to match.
2.  **Update Kernel**:
    -   Update `packages/arrowgram/src/core/arrow.ts` to implement the rendering logic (e.g. in `redraw_heads` or `edge_path`).
    -   Ensure it scales with line thickness (`level`).
    -   Update `mapSpecToStyle` in `packages/arrowgram/src/core/diagramModel.ts` if it requires mapping from Spec to internal Style.
3.  **Update UI**:
    -   Add the option to the `PropertyEditor` dropdowns in `packages/web/src/PropertyEditor.tsx`.

### 2.2 Releasing a New Version
1.  **Test**: Run `npm test --workspace=packages/arrowgram`.
2.  **Build**: Run `npm run build` in root (builds both packages).
3.  **Publish**:
    -   Navigate to `packages/arrowgram`.
    -   Run `npm publish` (ensure you are logged in).

### 2.3 Running E2E Tests
1.  **Run All**:
    ```bash
    npm run test:e2e --workspace=packages/web
    ```
2.  **Manual Verification**:
    -   Start dev server: `npm run dev`.
    -   Check Canvas visibility, Node creation (double click), Arrow connection.