# Arrowgram

**Arrowgram** is a toolkit for creating commutative diagrams for the web and research papers. It is designed to be easily used by humans and AI coding agents.

## Repository Structure

This is a monorepo managed by NPM Workspaces.

-   **`packages/arrowgram`**: The core library. Use this to render diagrams programmatically.
-   **`packages/web`**: The official web-based editor. [Launch Editor](https://hotdocx.github.io/arrowgram/) (Hypothetical link).

## Getting Started

### Prerequisites
-   Node.js (v18+)
-   NPM (v9+)

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

## Use with AI Agents

See [AGENTS.md](./AGENTS.md) for instructions on how to generate Arrowgram specifications.

## Documentation

-   [Product Requirements (PRD)](./PRD.md)
-   [API Reference (packages/arrowgram)](./packages/arrowgram/README.md)
