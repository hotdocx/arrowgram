# Arrowgram Functional Specification

## 1. Overview
Arrowgram is a declarative library and interactive editor for creating commutative diagrams. It focuses on visual quality, mathematical correctness, and ease of use for both humans and AI agents.

## 2. Core Features (The "Kernel")
The `arrowgram` package provides the core rendering logic.

### 2.1 Nodes
-   **Definition**: A point of interest in the diagram.
-   **Properties**:
    -   `name` (ID): String, unique.
    -   `label`: LaTeX string (rendered via KaTeX). **IMPORTANT: Backslashes must be double-escaped in JSON (e.g., `$\\pi$`).**
    -   `left`, `top`: Coordinates (pixels).
    -   `color`: Hex color string.
-   **Visuals**: Nodes are rendered as text labels centered at (left, top). They have an implicit "radius" (default 25px) that arrows connect to.

### 2.2 Arrows (Morphisms)
-   **Definition**: A directed connection between two nodes (or a node to itself).
-   **Properties**:
    -   `from`, `to`: Node IDs or Arrow IDs (for 2-cells).
    -   `label`: LaTeX string.
    -   `curve`: Curvature amount. 0 = straight. Positive = leftward.
    -   `shift`: Parallel offset amount.
    -   `color`: Hex color string.
    -   `label_color`: Hex color string.
    -   `label_alignment`: "over", "left", "right".
    -   `shorten`: { source: number, target: number } - gap at endpoints.
    -   `style`:
        -   `mode`: 'arrow', 'adjunction', 'corner', 'corner_inverse'.
        -   `head`: 'normal', 'none', 'epi', 'hook', 'maps_to', 'harpoon'.
        -   `tail`: 'normal', 'none', 'mono', 'hook', 'maps_to'.
        -   `body`: 'solid', 'dashed', 'dotted', 'squiggly', 'wavy', 'barred', 'double_barred', 'bullet_solid', 'bullet_hollow', 'none'.
        -   `level`: 1 (single), 2 (double/implication), 3 (triple).

### 2.3 Self-Loops (Endomorphisms)
-   **Definition**: An arrow where `from === to`.
-   **Geometry**: Rendered as a circular arc attached to the node.
-   **Properties**:
    -   `radius`: Size of the loop.
    -   `angle`: Angle of attachment (0-360 degrees).

## 3. Web Editor Features
The `web` package provides the interactive UI.

### 3.1 Workspace
-   **Infinite Canvas**: Pan and zoom support (via `ArrowGramEditor.jsx`).
-   **Interactive Editing**:
    -   **Drag**: Move nodes.
    -   **Connect**: Shift+Drag or use handles to connect nodes.
    -   **Select**: Click to select nodes/arrows.
    -   **Properties**: Edit labels, styles, colors, and curvature in the side panel.

### 3.2 Manipulation Tools
-   **Reverse Arrow**: Swaps the `from` and `to` nodes of a selected arrow.
-   **Flip Arrow**: Inverts the `curve` or `angle` without changing direction.
-   **Rotate Nodes**: Rotates selected nodes around their collective center.
-   **Flip Nodes**: Mirrors selected nodes across the horizontal or vertical axis.
-   **Fit View**: Adjusts the zoom to show all content.

### 3.3 Reliability & Persistence
-   **Undo/Redo**: 100-step history stack.
-   **Projects**: Save/Load diagrams to browser LocalStorage (IndexedDB).
-   **Export**:
    -   **SVG**: Native vector format.
    -   **PNG**: High-res raster export.
    -   **TikZ**: Export to LaTeX code (for papers).

## 4. AI Interoperability
-   **JSON Schema**: Formal specification for agents.
-   **Chat Interface**: Stubbed "Wizard of Oz" interface for future LLM integration.
-   **Simulated CoT**: Examples in `AGENTS.md` showing how an agent should think before drawing.
