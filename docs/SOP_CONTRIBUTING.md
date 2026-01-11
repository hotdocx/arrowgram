# SOP: Contributing and Architecture Guide

## 1. Architecture Overview

### 1.1 Monorepo Structure
Arrowgram is a monorepo managed by NPM Workspaces.
-   `packages/arrowgram`: **Core Library**. Pure logic and React rendering components. Zero UI dependencies (buttons, inputs).
-   `packages/web`: **Web Application**. The editor UI, built with React, Vite, Tailwind CSS, and Zustand.

### 1.2 The "Kernel" (`packages/arrowgram`)
The heart of the system is the **Diagram Model**.
-   **`diagramModel.js`**: Takes a JSON spec and computes the geometry (lines, curves, control points).
-   **`geometry.js`**: A pure 2D vector math helper (`Vec2`). **All** geometric calculations must use this helper for consistency.
-   **`ArrowGramDiagram.jsx`**: A "dumb" renderer. It takes the computed model and spits out SVG elements.

### 1.3 State Management (`packages/web`)
We use **Zustand** for state, with **Zundo** for undo/redo.
-   **Store**: `projects/web/src/store/diagramStore.js`.
-   **Persistence**: `idb-keyval` saves projects to IndexedDB.

## 2. Standard Operating Procedures (SOPs)

### 2.1 Adding a New Arrow Style
1.  **Update Schema**: Add the new style option to `arrowgram.schema.json`.
2.  **Update Kernel**:
    -   Modify `renderArrowPart` in `diagramModel.js` to handle the new `head` or `tail` type.
    -   Ensure it scales with line thickness (`level`).
3.  **Update UI**:
    -   Add the option to the `PropertyEditor` dropdowns in `packages/web`.

### 2.2 Releasing a New Version
1.  **Test**: Run `npm test` in `packages/arrowgram`.
2.  **Build**: Run `npm run build` in root (builds both packages).
3.  **Publish**:
    -   Navigate to `packages/arrowgram`.
    -   Run `npm publish` (ensure you are logged in).

### 2.3 Running E2E Tests
1.  Start the dev server: `npm run dev` in `packages/web`.
2.  Run Playwright (future setup) or use the Browser Agent to verify:
    -   Canvas visibility.
    -   Node creation (double click).
    -   Arrow connection.
