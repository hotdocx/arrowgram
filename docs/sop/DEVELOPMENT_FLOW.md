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
*   `packages/agent`: The file-backed bridge/runtime for agent-friendly editing.
*   `packages/lastrevision`: The private SaaS host/runtime (TanStack Start + Postgres + Better Auth).
*   `docs/`: Documentation and SOPs.
*   `reports/`: Consolidated current-state reports, active detailed plans, and short implementation plans. Retired historical reports live in ignored `.scratchpad/reports-archive-2026-07-08/`.

## 3. Development Cycle

### 3.1. Starting the Environment
To develop the web application with hot-reloading:
```bash
npm run dev
```
This starts the Vite server (usually at `http://localhost:5173`).

To develop the SaaS app locally (private repo only):

```bash
npm run dev -w packages/lastrevision
```

This starts the TanStack Start dev server at `http://localhost:3000`.
See `docs/sop/LASTREVISION_LOCAL_DEV.md` for bearer-token auth and local validation scripts.

### 3.2. Making Changes
1.  **Orient:** Read `AGENTS.md`, the relevant durable docs/specs, and one current-state report if status context is needed:
    *   `reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md`
    *   `reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md`
    *   `reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md`
    *   active detailed plans such as the Azure migration plan or agent-friendly editor plan when working in those areas
2.  **Identify the Scope:** Determine if the change belongs in `packages/arrowgram` (schema/rendering/math), `packages/web` (editor UI/adapters/papers), `packages/agent` (file bridge), or private `packages/lastrevision` (SaaS host).
3.  **Edit Code:** Follow the project's coding style (TypeScript, functional components, hooks).
4.  **Verify Locally:** Run the focused validation command for the touched package and use the running web app to visually verify UI changes.
5.  **Protect OSS Boundaries:** Never move private `packages/lastrevision` code, secrets, env files, or generated runtime state into allowlisted OSS paths.

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
*   See `docs/sop/LASTREVISION_LOCAL_DEV.md` for SaaS local dev/testing/storage.
*   See `docs/sop/OSS_MIRRORING.md` before exporting or deploying the OSS mirror.
*   Search archived reports directly with `rg "term" .scratchpad/reports-archive-2026-07-08` only when current docs/code do not answer a historical question.
