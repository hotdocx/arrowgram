# Arrowgram Monorepo Context & AI Agent Guide

## 1. Project Overview & Quick Start
**Arrowgram** is a production-grade toolkit for creating commutative diagrams for the web and research papers. It is designed for both human use (via a web editor) and AI generation (via a strict JSON API).

This repository is a **Monorepo** managed by NPM Workspaces containing:

*   **`packages/arrowgram` (Core):** The core geometry engine, Zod schemas, and React renderer.
*   **`packages/web` (Editor):** The client-side web editor (React + Vite).
*   **`packages/paged` (Viewer):** A viewer for rendering "Paper" projects (Markdown + Diagrams) using Paged.js.
*   **`packages/lastrevision` (SaaS):** A full-stack community platform ("Full Stack Campus") built with TanStack Start, Drizzle ORM, and Better Auth. This is the **private** SaaS component.

### Essential Commands
*   **Install:** `npm install` (Root)
*   **Dev (Editor):** `npm run dev -w packages/web`
*   **Dev (SaaS):** `npm run dev -w packages/lastrevision`
*   **Dev Stripe (SaaS):** `npm run stripe:listen -w packages/lastrevision`
*   **Test (Core):** `npm test -w packages/arrowgram` (Vitest)
*   **Test (Web):** `npm test -w packages/web` (Jest)
*   **E2E (Web):** `npm run test:e2e -w packages/web` (Playwright)
*   **Validate (SaaS Local):** `scripts/validate_lastrevision_local.sh`
*   **CLI commands:** `gcloud` (admin-logged in), `az` (admin-logged in), `stripe` (admin-logged in), `gh` (admin-logged in), `curl`, `ngrok`, `certbot`, `docker`, etc...

---

## 2. Documentation Index (Context Map)

Refer to these files for detailed specific knowledge.

### Product & Specs
*   **@PRD.md**: Executive summary, competitive analysis (vs Quiver), and high-level product architecture.
*   **@docs/FUNCTIONAL_SPEC.md**: Detailed feature breakdown for nodes, arrows, styling, and editor interaction.
*   **@docs/ARROWGRAM_SPEC.md**: **CRITICAL**. The authoritative JSON schema definition (`DiagramSpec`). Read this before generating any diagrams.
*   **@AGENTS.md**: Specific instructions for AI agents (layout logic, conventions).

### Standard Operating Procedures (SOPs)
*   **@docs/sop/DEVELOPMENT_FLOW.md**: How to set up the environment, make changes, and build.
*   **@docs/sop/ARCHITECTURE.md**: Deep dive into the "Kernel" (`core`), State Management (`web`), and Hybrid Architecture.
*   **@docs/sop/TESTING.md**: The Testing Pyramid (Unit > Integration > E2E) and tools (Vitest, Jest, Playwright).
*   **@docs/sop/LASTREVISION_LOCAL_DEV.md**: **CRITICAL for SaaS**. Local dev + local/remote validation scripts, bearer token auth, and storage (GCS vs R2) selection.
*   **@packages/lastrevision/docs/reference-ids.md**: Reference IDs for published gallery posts (`/r/:referenceId` → `/p/:postId`).
*   **@docs/SOP_CONTRIBUTING.md**: Contribution guidelines, commit formats, and release process.
*   **@docs/sop/OSS_MIRRORING.md**: How this private super-repo mirrors the OSS subset to `hotdocx/arrowgram`.

### Reports & Design Documents
*   **@reports/FEASIBILITY_SAAS.md**: Analysis of splitting the SaaS hosting (GitHub Pages frontend + Cloud Run backend).
*   **@reports/REFERENCE_ID_ARCHITECTURE.md**: Reference-ID architecture (source project writeup; ID format + alias + redirect pattern).
*   **@reports/PLAN_REFERENCE_ID_PORT.md**: LastRevision port plan + implementation checklist for Reference IDs.
*   **@reports/PLAN_REVEAL_JS_TEMPLATE.md**: Reveal.js slides master template + per-paper CSS side-artifact plan/status.
*   **@reports/TASKS_SAAS.md**: Current implementation tasks and status for the SaaS integration.
*   **@reports/WORKSPACE_FILES_V2_DESIGN.md**: Design for "Workspace Files" (attachments), AI context handling, and artifact snapshots.

---

## 3. Architecture & System Design

### Core Principles
1.  **Monorepo:** Managed by NPM Workspaces.
2.  **Hybrid Architecture:**
    *   `@arrowgram/core` is pure logic/rendering, usable headless or in client.
    *   `@arrowgram/web` is the "Body", a client-side PWA.
    *   `packages/lastrevision` is the SaaS layer, wrapping the editor with remote persistence and auth.
3.  **Split Hosting (SaaS):**
    *   **Frontend:** `https://hotdocx.github.io/` (GitHub Pages, Static SPA).
    *   **Backend:** `https://<service>.run.app` (Cloud Run, API + Auth + DB).
    *   **Auth:** Token-based (Bearer) to support split origins. **No Third-Party Cookies.**

### SaaS Integration (`packages/lastrevision`)
*   **Tech:** TanStack Start, Drizzle (Postgres), Better Auth, Stripe, Google Cloud Storage.
*   **Pattern:** "Shared Editor Core + Pluggable Backends".
    *   The editor (`@arrowgram/web`) defines `ProjectRepository` interfaces.
    *   **Local Adapter:** Uses IndexedDB (for OSS users).
    *   **Remote Adapter:** Uses HTTP API to Cloud Run (for SaaS users).
*   **Auth:** bearer token stored in `localStorage` key `hotdocx_bearer_token`. `/api/my/*` returns `401` until you sign in.
*   **Uploads:** browser uploads go directly to object storage via presigned PUT URLs (bucket CORS required).
*   **AI Proxy:** SaaS uses a server-side proxy (`/api/my/ai/proxy`) to inject API keys and track usage, while OSS uses "Bring Your Own Key" (BYOK) client-side.

---

## 4. Development & Testing Workflows

### Testing Strategy (@docs/sop/TESTING.md)
We use a **Testing Pyramid**:
1.  **Unit (Core):** `npm test -w packages/arrowgram` (Vitest). Validates geometry and schema.
2.  **Unit/Integration (Web):** `npm test -w packages/web` (Jest). Validates React components and store.
3.  **E2E (Web):** `npm run test:e2e -w packages/web` (Playwright). Validates rendering and user interaction.
4.  **SaaS Validation:** `scripts/validate_lastrevision_local.sh` runs Docker DB + API Smoke + Playwright.

### Deployment Scripts (@scripts/)
*   **`deploy_arrowgram_pages.sh`**: Deploys OSS editor to `hotdocx/arrowgram` (gh-pages).
*   **`deploy_lastrevision_pages.sh`**: Deploys SaaS SPA to `hotdocx/hotdocx.github.io` (gh-pages).
*   **`deploy_lastrevision_cloudrun.sh`**: Deploys SaaS API to Google Cloud Run.
*   **`export_oss.sh`**: Exports the OSS subset for mirroring.
*   **`smoke_lastrevision.sh`**: Curl-based smoke test for the deployed API.

### OSS Mirroring
This is a **private super-repo**. Code in `packages/lastrevision` is **PRIVATE**.
*   **Mirroring:** We export only allowlisted paths (`packages/arrowgram`, `packages/web`, etc.) to the public repo.
*   **Safety:** The `scripts/export_oss.sh` script enforces this allowlist. **NEVER** commit secrets or private code to allowlisted paths.

---

## 5. AI Agent Guidelines (Specifics)

### Diagram Generation (JSON)
*   **Schema:** Adhere strictly to `@docs/ARROWGRAM_SPEC.md`.
*   **IDs:** Use descriptive IDs (`node_A`, `arrow_f`) for clarity.
*   **LaTeX:** Always use LaTeX for labels (e.g., `$\to$`, `$\alpha$`). Escape backslashes: `"$\to$" `.
*   **Curvature:** Use `curve` (pixels) for bending. Positive = Left (CCW), Negative = Right (CW).

### Paper Generation (Markdown)
*   **Structure:** Standard Markdown with YAML frontmatter.
*   **Embedding:** Wrap diagram JSON in `<div class="arrowgram">...</div>`.
*   **Render templates:** Papers can render as paged articles (Paged.js) or slide decks (Reveal.js).
    *   **Paged (article/book):** Continuous Markdown with sections.
    *   **Slides (Reveal):** Slides separated by a line containing only `---` (outside code fences).

### Workspace Files & Context
*   **Mentions:** Users can mention `@workspace:<file>` to include file context.
*   **Artifacts:** The AI edits a single "Artifact" (Diagram or Paper) per project.
*   **Protocol:**
    *   System prompt is static.
    *   Artifact snapshots and Workspace Indexes are injected as **Request-Time User Context**.
    *   Attachments are passed as **File Parts** (if supported) or text blocks.

---

## 6. Current Roadmap & Tasks

Refer to **@reports/TASKS_SAAS.md** for the active checklist.
*   **Priority:** Finalizing the SaaS integration (Sharing UX, AI Proxy, Workspace Files v2).
