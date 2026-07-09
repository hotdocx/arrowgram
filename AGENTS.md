# Arrowgram Monorepo Context & AI Agent Guide

## 1. Project Overview & Quick Start
**Arrowgram** is a production-grade toolkit for creating commutative diagrams for the web and research papers. It is designed for both human use (via a web editor) and AI generation (via a strict JSON API).

This repository is a **Monorepo** managed by NPM Workspaces containing:

*   **`packages/arrowgram` (Core):** The core geometry engine, Zod schemas, and React renderer.
*   **`packages/web` (Editor):** The client-side web editor (React + Vite).
*   **`packages/paged` (Viewer):** A viewer for rendering "Paper" projects (Markdown + Diagrams) using Paged.js.
*   **`packages/lastrevision` (SaaS):** The private Hotdocx/LastRevision SaaS host built with TanStack Start, Drizzle ORM, Better Auth, Stripe, and object storage.

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
*   **@docs/sop/LASTREVISION_LOCAL_DEV.md**: **CRITICAL for SaaS**. Local dev + local/remote validation scripts, bearer token auth, and storage (Azure Blob vs GCS/R2) selection.
*   **@packages/lastrevision/docs/reference-ids.md**: Reference IDs for published gallery posts (`/r/:referenceId` → `/p/:postId`).
*   **@docs/SOP_CONTRIBUTING.md**: Contribution guidelines, commit formats, and release process.
*   **@docs/sop/OSS_MIRRORING.md**: How this private super-repo mirrors the OSS subset to `hotdocx/arrowgram`.

### Reports & Design Documents
*   **@reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md**: Current OSS editor/package status, paper/reveal/print pipelines, agent bridge, and validation map.
*   **@reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md**: Current private SaaS product status: auth, storage, AI proxy, gallery/publications, reference IDs, and training/community surfaces.
*   **@reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md**: Current local workflow, testing, OSS mirroring, Azure deployment, and legacy Cloud Run rollback context.
*   **@reports/PLAN_AZURE_MIGRATION_GETPAIDX_SHARED_RESOURCES_2026-07-05.md**: Active detailed plan for the ongoing LastRevision Azure migration/cutover work.
*   **@reports/PLAN_AGENT_FRIENDLY_ARROWGRAM_EDITOR_2026-07-07.md**: Active detailed plan for file-backed/agent-friendly Arrowgram editor integration.
*   **@reports/RETIRED_REPORTS_INDEX_2026-07-08.md**: Map from retired report families to the consolidated current-state reports.
*   **Archive note:** retired historical reports are locally recoverable under `.scratchpad/reports-archive-2026-07-08/` but should not be treated as normal source-of-truth docs.
*   **LastRevision template-doc note:** `@packages/lastrevision/docs/features/` and older template-flavored package docs came from the unfinished starter app. Use them only as historical context after checking live code and the current LastRevision docs/reports.

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
    *   **Backend:** Azure Container Apps for the current GetPaidX-shared migration target; legacy Cloud Run remains as rollback/reference until cutover is complete.
    *   **Auth:** Token-based (Bearer) to support split origins. **No Third-Party Cookies.**

### SaaS Integration (`packages/lastrevision`)
*   **Tech:** TanStack Start, Drizzle (Postgres), Better Auth, Stripe, Azure Blob Storage (current Azure target), with GCS/R2 as legacy/fallback storage providers.
*   **Pattern:** "Shared Editor Core + Pluggable Backends".
    *   The editor (`@arrowgram/web`) defines `ProjectRepository` interfaces.
    *   **Local Adapter:** Uses IndexedDB (for OSS users).
    *   **Remote Adapter:** Uses bearer-auth HTTP APIs exposed by the SaaS backend.
*   **Auth:** bearer token stored in `localStorage` key `hotdocx_bearer_token`. `/api/my/*` returns `401` until you sign in.
*   **Uploads:** browser uploads go directly to object storage via signed PUT URLs (bucket/container CORS required). Azure Blob is preferred for the GetPaidX-shared Azure deployment; GCS/R2 remain fallback/legacy providers.
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
*   **`deploy_lastrevision_cloudrun.sh`**: Legacy/rollback deploy for SaaS API to Google Cloud Run.
*   **`deploy_lastrevision_azure.sh`**: Deploys SaaS API to Azure Container Apps using GetPaidX shared Azure resources.
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

Use the consolidated current-state reports before starting new work:
*   **Editor/package work:** see **@reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md**.
*   **Agent-friendly editor work:** see **@reports/PLAN_AGENT_FRIENDLY_ARROWGRAM_EDITOR_2026-07-07.md** for the active detailed implementation plan.
*   **SaaS product work:** see **@reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md**.
*   **Testing/deploy/DevOps work:** see **@reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md**.
*   **Azure migration/cutover work:** see **@reports/PLAN_AZURE_MIGRATION_GETPAIDX_SHARED_RESOURCES_2026-07-05.md** for the active detailed migration plan.
*   **Historical context:** search `.scratchpad/reports-archive-2026-07-08/` only when current code/docs are ambiguous.
