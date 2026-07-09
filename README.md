# Arrowgram

**Arrowgram** is a production-grade toolkit for creating commutative diagrams for the web and research papers. It is designed to be easily used by humans (via a sleek web editor) and AI coding agents (via a strictly typed JSON API).

**Try it now at: [https://hotdocx.github.io/arrowgram](https://hotdocx.github.io/arrowgram)**

# LastRevision on Hotdocx

LastRevision offers live cohort training that helps professionals use AI tools in general and apply them directly to Arrowgram workflows for diagrams, books, and slide decks.

No coding needed.

You learn practical ChatGPT and 15+ AI-tool workflows for real work, then use the same stack to produce publish-ready technical outputs in days, not months.

Weekly sessions focus on both:
- General AI productivity and delivery workflows you can reuse across roles
- Arrowgram-specific creation workflows for AI-assisted diagrams, papers/books, and slide decks

Join professionals, instructors, and researchers in live sessions that convert ideas into publishable outputs.

- 3 hours weekly Saturday cohorts, 7:30 PM GST (UTC+4)
- Free for this intro cohort
- 20,000+ community network
- Weekly live Saturday cohorts
- Hotdocx + LastRevision + Arrowgram stack

**Enroll and launch your workspace: [https://hotdocx.github.io](https://hotdocx.github.io)**

# LastRevision.pro

Build and publish your professional AI agents that co-work for you 24/7, save you time, and get you funded by fans and local clients.

- Dedicated 24/7 cloud computers
- Webhook trigger events, scheduled automations
- API tools, Gmail, Website, Latex, Excel, PDF tools
- Agent-to-agent marketplace
- Run your AI workspace from Telegram or WhatsApp chat
- OpenClaw-compatible 🦞 for professionals

**Explore LastRevision.pro: [https://LastRevision.pro/](https://LastRevision.pro/)**

![Arrowgram Screenshot](packages/web/arrowgram.png)

## Key Features

-   **Declarative Syntax:** JSON-based specification (`DiagramSpec`) that is human-readable and AI-friendly.
    -   *Note: In JSON strings, LaTeX backslashes must be escaped (e.g. `$\\to$`).*
-   **Modern Web Editor:**
    -   **Project Management:** Create, save, and manage multiple diagrams locally (IndexedDB).
    -   **Academic authoring:** Draft papers (Paged.js) and slide decks (Reveal.js) with the same Arrowgram + KaTeX + Mermaid + Vega pipeline.
    -   **Keyboard First:** Vim-like speed for power users (`Shift+Drag` to connect, `Ctrl+Z` to undo).
    -   **Manipulation:** Flip, Reverse, Rotate, and Fit-to-screen tools.
    -   **AI Co-Pilot:** Native integration with Google Gemini 2.0 to generate and modify diagrams via natural language.
    -   **High-Quality Rendering:** KaTeX integration for beautiful mathematical typography.
    -   **Advanced Styles:** Support for adjunctions, pullbacks, squiggly arrows, proarrows, bullets, and more.
-   **Production Ready:**
    -   **Export:** SVG, PNG, and TikZ-CD (for LaTeX papers).
    -   **Standalone Libraries:** Use `@hotdocx/arrowgram` for the core renderer/schema and `@hotdocx/arrowgram-web` for the embeddable workspace UI.

## Repository Structure

This is a monorepo managed by NPM Workspaces.

-   **`packages/arrowgram`**: The core library. Contains the geometry engine, Zod schemas, and React renderer. Tested with **Vitest**.
-   **`packages/web`**: The official web-based editor. Built with React, Vite, and Paged.js. Tested with **Jest**.
-   **`packages/agent`**: File-backed bridge/runtime for agent-friendly Arrowgram editing and static output.
-   **`packages/lastrevision`**: Private SaaS host/runtime for Arrowgram (TanStack Start + Postgres + Better Auth). Not included in the OSS mirror.
-   **`tmp-quiver-codebase`**, **`tmp-arrowgram-original`**: Reference implementations and inspiration sources.

## Getting Started

### Prerequisites
-   Node.js (v20+)
-   NPM (v10+)
-   (Optional) Google Gemini API Key for AI features.

### Installation

**Public OSS clone (default):**

```bash
git clone https://github.com/hotdocx/arrowgram.git
cd arrowgram
npm install
```

**Private super-repo clone (internal maintainers):**

```bash
git clone https://github.com/hotdocx/arrowgram-super.git arrowgram
cd arrowgram
git remote add public https://github.com/hotdocx/arrowgram.git
npm install
```

### Development

**Start the Web Editor:**

```bash
npm run dev
# Starts Vite dev server at http://localhost:5173 (usually)
```

**Start the SaaS app (private repo only):**

```bash
npm run dev -w packages/lastrevision
# Starts TanStack Start dev server at http://localhost:3000
```

See `docs/sop/LASTREVISION_LOCAL_DEV.md` for bearer token auth, local validation scripts, and attachment upload (CORS) notes.

**Use the Codex plugins:**

The Arrowgram Codex plugin source lives in `plugins/arrowgram`; it packages the `arrowgram` skill plus a helper script that runs the local `arrowgram-agent` CLI when available and otherwise falls back to `npx -y @hotdocx/arrowgram-agent`.

The public `getpaidx` plugin lives in `plugins/getpaidx` and connects Codex to the hosted GetPaidX OAuth MCP endpoint for cloud posts and Arrowgram workspaces. Both plugins are listed by `.agents/plugins/marketplace.json` and are exported to the OSS mirror. Install the public marketplace with `codex plugin marketplace add hotdocx/arrowgram --sparse .agents/plugins --sparse plugins`, then install the desired plugin from the `hotdocx` marketplace.

**Deploy the SaaS backend to the GetPaidX Azure environment (private repo only):**

```bash
GPX_ENV_FILE=/home/user1/closerfans/.env.production npm run deploy:lastrevision:azure
```

This creates/updates the ArrowGram `lastrevision-app` Azure Container App, uses a separate `lastrevision` database on the shared GetPaidX Azure PostgreSQL server, and uses Azure Blob for uploads. Current deployment and rollback context is summarized in [Current Operations, Testing, And Deployment](./reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md).

**Run Tests:**

```bash
# Core Library Tests (Geometry, Schema)
npm test --workspace=packages/arrowgram

# Web App Tests (Components, Logic)
npm test --workspace=packages/web
```

**Build All Packages:**

```bash
npm run build
```

## Private -> Public Release Flow

When working in the private super-repo:

1. Push private source of truth:
   - `git push origin main`
2. Export allowlisted OSS subset and sync public repo:
   - `scripts/sync_public_oss.sh`
3. Deploy OSS site to public `gh-pages`:
   - `scripts/deploy_arrowgram_pages.sh`

Safety:
- `scripts/export_oss.sh` is allowlist-based and excludes `packages/lastrevision/**`.
- Never push private code directly to `https://github.com/hotdocx/arrowgram`.
- See `docs/sop/OSS_MIRRORING.md` for the full SOP.

## For AI Agents

Start with [AGENTS.md](./AGENTS.md) (repo context map + workflows), then read:

- [JSON API Specification](./docs/ARROWGRAM_SPEC.md) (DiagramSpec schema)
- [Current Arrowgram Editor And Packages](./reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md) (editor/package status snapshot)
- [Current LastRevision SaaS Product](./reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md) (private SaaS status snapshot)
- [Current Operations, Testing, And Deployment](./reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md) (validation, mirroring, deployment)
- [LastRevision Local Dev](./docs/sop/LASTREVISION_LOCAL_DEV.md) (SaaS local/dev/prod testing + storage)
- [LastRevision Reference IDs](./packages/lastrevision/docs/reference-ids.md) (permanent citation IDs for publications)
- Active detailed plans:
  - [Azure Migration Plan](./reports/PLAN_AZURE_MIGRATION_GETPAIDX_SHARED_RESOURCES_2026-07-05.md)
  - [Agent-Friendly Arrowgram Editor Plan](./reports/PLAN_AGENT_FRIENDLY_ARROWGRAM_EDITOR_2026-07-07.md)
  - [Codex Plugin Architecture Plan](./reports/PLAN_CODEX_PLUGIN_ARCHITECTURE_ARROWGRAM_GETPAIDX_2026-07-08.md)

Note for `packages/lastrevision`: `packages/lastrevision/docs/features/` and some older package docs are mostly historical starter-template material from the unfinished base app. Treat them as implementation archaeology only; current LastRevision behavior is defined by live code, package docs listed above, root SOPs, and the consolidated current-state reports.

## Documentation

-   [Product Requirements (PRD)](./PRD.md)
-   [Functional Specification](./docs/FUNCTIONAL_SPEC.md)
-   [JSON API Specification](./docs/ARROWGRAM_SPEC.md)
-   **Standard Operating Procedures (SOPs):**
    -   [Development Flow](./docs/sop/DEVELOPMENT_FLOW.md)
    -   [Architecture & Design](./docs/sop/ARCHITECTURE.md)
    -   [Testing Strategy](./docs/sop/TESTING.md)
    -   [LastRevision Local Dev](./docs/sop/LASTREVISION_LOCAL_DEV.md)
-   [Contributing SOP](./docs/SOP_CONTRIBUTING.md)
-   [Current Arrowgram Editor And Packages](./reports/CURRENT_ARROWGRAM_EDITOR_AND_PACKAGES_2026-07-08.md)
-   [Current LastRevision SaaS Product](./reports/CURRENT_LASTREVISION_SAAS_PRODUCT_2026-07-08.md)
-   [Current Operations, Testing, And Deployment](./reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md)
-   [Retired Reports Index](./reports/RETIRED_REPORTS_INDEX_2026-07-08.md)
-   [Azure Migration Plan](./reports/PLAN_AZURE_MIGRATION_GETPAIDX_SHARED_RESOURCES_2026-07-05.md)
-   [Agent-Friendly Arrowgram Editor Plan](./reports/PLAN_AGENT_FRIENDLY_ARROWGRAM_EDITOR_2026-07-07.md)

## License

MIT
