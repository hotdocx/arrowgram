# Development Flow SOP

## 1. Overview
This document outlines the standard operating procedure for developing features and fixing bugs in the Arrowgram repository. Adhering to these guidelines ensures code quality, consistency, and a smooth collaboration process for both human developers and AI agents.

**Important:** Any changes to the JSON Schema in `packages/arrowgram/src/types.ts` must be reflected in `docs/ARROWGRAM_SPEC.md` and potentially in this document if workflows change.

## 2. Workspace Setup
Arrowgram is a monorepo managed by **NPM Workspaces**.

### 2.1. Installation
Always ensure dependencies are up-to-date.
```bash
npm install
```

### 2.2. Directory Structure
*   `packages/arrowgram`: The core library (math, rendering, schema).
*   `packages/web`: The web application (UI, state, persistence).
*   `docs/`: Documentation and SOPs.
*   `reports/`: Analysis reports (e.g., gap analysis).

## 3. Development Cycle

### 3.1. Starting the Environment
To develop the web application with hot-reloading:
```bash
npm run dev
```
This starts the Vite server (usually at `http://localhost:5173`).

### 3.2. Making Changes
1.  **Identify the Scope:** Determine if the change belongs in `core` (rendering logic, math) or `web` (UI, interaction).
2.  **Edit Code:** Follow the project's coding style (TypeScript, functional components, hooks).
3.  **Verify Locally:** Use the running web app to visually verify changes.

### 3.3. Building
To ensure everything compiles correctly:
```bash
npm run build
```
This builds both workspaces.

## 4. Testing & Validation

### 4.1. Core Library (`packages/arrowgram`)
*   **Tool:** Vitest
*   **Purpose:** Unit tests for geometry, math, and schema validation.
*   **Command:**
    ```bash
    npm test --workspace=packages/arrowgram
    ```

### 4.2. Web Application (`packages/web`)
*   **Tool:** Jest (Unit/Integration) & Playwright (E2E)
*   **Purpose:**
    *   **Jest:** Testing React components and store logic.
    *   **Playwright:** Visual regression and interaction testing.
*   **Commands:**
    ```bash
    # Unit Tests
    npm test --workspace=packages/web

    # E2E Tests (Visual/Interaction)
    npm run test:e2e --workspace=packages/web
    ```

## 5. Commit Guidelines
*   **Format:** conventional commits (e.g., `feat: add adjunction style`, `fix: resolve arrow intersection bug`).
*   **Granularity:** Keep commits atomic.
*   **Message:** Explain *why* the change was made, not just *what* changed.

## 6. Reference Material
*   See `docs/sop/ARCHITECTURE.md` for system design.
*   See `docs/sop/TESTING.md` for detailed testing strategies.
