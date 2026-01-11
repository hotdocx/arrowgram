# Arrowgram Product Requirements Document (PRD)

## 1. Introduction

**Product Name:** Arrowgram
**Goal:** Create a production-grade NPM package and web editor for generating category-theory commutative diagrams.
**Target Audience:**
-   Mathematicians and Students (Category Theory).
-   AI Coding Agents (generating diagrams for research papers).
-   Developers (integrating diagrams into docs/websites).

## 2. Value Proposition

-   **Declarative:** JSON-based specification is easy for both humans and AI to read/write.
-   **Visual:** "What You See Is What You Get" (WYSIWYG) editor with automatic layout intelligence.
-   **Interoperable:** Compatible with `q.uiver.app` and LaTeX (`tikz-cd`).
-   **Embeddable:** Designed to run client-side in browsers or server-side (via Node.js/SSR).

## 3. Core Features

### 3.1. Core Library (`packages/arrowgram`)
-   **Geometry Engine:** Pure function `computeDiagram(spec) -> model` handling calculating coordinates, arrow paths (curves, loops), and label placement.
-   **React Renderer:** `<ArrowGramDiagram />` component rendering the model to SVG.
-   **Math Support:** KaTeX integration for high-quality mathematical typesetting in labels.
-   **Higher-Order Arrows:** Support for arrows between arrows (2-cells).

### 3.2. Web Editor (`packages/web`)
-   **Interactive Canvas:** Drag-and-drop nodes, click-and-drag to connect.
-   **Property Inspector:** Fine-grained control over Arrow styles (epi, mono, dashed, specific curves) and node labels.
-   **Live Preview:** Real-time updates.
-   **Persistence:** Save/Load projects (Local Storage / IndexedDB).
-   **Export:** SVG, PNG, TikZ-CD, Quiver URL.

## 4. Technical Requirements

-   **Monorepo:** Managed via NPM Workspaces.
-   **Build System:** Vite.
-   **Testing:** Vitest (Logic), Playwright (E2E).
-   **Formatting/Linting:** Prettier, ESLint.

## 5. AI Integration (AGENTS.md)

-   The JSON spec must be stable and documented.
-   Documentation should include "few-shot" examples for LLMs to learn the syntax.

## 6. Future Roadmap

-   **Auto-layout:** Force-directed or layer-based algorithms to position nodes automatically.
-   **Collaboration:** Real-time multi-user editing (Yjs).
-   **Backend:** Authenticated storage for user diagrams.
