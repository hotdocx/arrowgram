# Arrowgram

**Arrowgram** is a production-grade toolkit for creating commutative diagrams for the web and research papers. It is designed to be easily used by humans (via a sleek web editor) and AI coding agents (via a strictly typed JSON API).

![Arrowgram Screenshot](packages/web/arrowgram.png)

## Key Features

-   **Declarative Syntax:** JSON-based specification (`DiagramSpec`) that is human-readable and AI-friendly.
-   **Modern Web Editor:**
    -   **Project Management:** Create, save, and manage multiple diagrams locally (IndexedDB).
    -   **Keyboard First:** Vim-like speed for power users (`Shift+Drag` to connect, `Ctrl+Z` to undo).
    -   **AI Co-Pilot:** Native integration with Google Gemini 2.0 to generate and modify diagrams via natural language.
    -   **High-Quality Rendering:** KaTeX integration for beautiful mathematical typography.
-   **Production Ready:**
    -   **Export:** SVG, PNG, and TikZ-CD (for LaTeX papers).
    -   **Standalone Library:** Use `@arrowgram/core` in your own React apps or server-side pipelines.

## Repository Structure

This is a monorepo managed by NPM Workspaces.

-   **`packages/arrowgram`**: The core library. Contains the geometry engine and React renderer.
-   **`packages/web`**: The official web-based editor. [Launch Editor](https://hotdocx.github.io/arrowgram/).

## Getting Started

### Prerequisites
-   Node.js (v18+)
-   NPM (v9+)
-   (Optional) Google Gemini API Key for AI features.

### Installation

```bash
git clone https://github.com/hotdocx/arrowgram.git
cd arrowgram
npm install
```

### Development

Run the web editor locally:

```bash
npm run dev
```

Build all packages:

```bash
npm run build
```

## For AI Agents

Are you an LLM trying to generate a diagram? Read [AGENTS.md](./AGENTS.md) for the complete API specification and examples.

## Documentation

-   [Product Requirements (PRD)](./PRD.md)
-   [Functional Specification](./docs/FUNCTIONAL_SPEC.md)
-   [Contributing SOP](./docs/SOP_CONTRIBUTING.md)

## License

MIT