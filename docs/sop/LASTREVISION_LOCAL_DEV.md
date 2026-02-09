# LastRevision (SaaS) Local Dev, Testing, and Storage

This SOP documents how to run and validate the private SaaS app (`packages/lastrevision`) **locally** (no GitHub Pages / no Cloud Run deploy) and how storage is selected across local vs deployed environments.

If you are an AI agent starting from the repo root, start here after reading `AGENTS.md`.

---

## 0) Mental model (split hosting)

LastRevision is deployed in **split-hosting** mode:

- **Frontend (static SPA):** `https://hotdocx.github.io/`
- **Backend (API):** Cloud Run `https://<service>.run.app`

Locally, both frontend and backend run on the same dev origin:

- `http://localhost:3000`

See also:
- `packages/lastrevision/docs/deploy.md`
- `packages/lastrevision/docs/reference-ids.md` (publication reference IDs)

---

## 1) Auth: why `/api/my/*` returns 401

Most LastRevision “my” endpoints are protected:

- `/api/my/papers`, `/api/my/diagrams`, `/api/my/attachments`, `/api/my/uploads/*`, `/api/my/ai/proxy`, …
- `/api/my/ai/settings`

LastRevision intentionally uses **bearer token auth** (not cookies) so split hosting works reliably.

- The client stores the bearer token in `localStorage` under key `hotdocx_bearer_token`.
- Requests include `Authorization: Bearer <token>`.
- If `hotdocx_bearer_token` is missing/empty/invalid, the backend returns `401 Unauthorized`.

See: `packages/lastrevision/docs/authentication.md`.

### 1.1 Common local dev gotcha: stale token after DB reset

If you reset the dev DB or change `BETTER_AUTH_SECRET`, any existing token in `localStorage` may become invalid.

Fix:
- Delete `hotdocx_bearer_token` from browser localStorage.
- Re-run `/sign-in` or `/sign-up`.

---

## 2) One-command local validation (recommended)

From repo root:

```bash
scripts/validate_lastrevision_local.sh
```

What it does:

- Starts Postgres via Docker (`npm -w packages/lastrevision run db:up`)
- Runs migrations (`npm -w packages/lastrevision run db:migrate`)
- Starts the TanStack Start dev server (`packages/lastrevision`, port `3000`) if it is not already running
- Runs backend smoke tests (`scripts/smoke_lastrevision.sh`)
- Runs Playwright E2E tests (`npm -w packages/lastrevision run test:e2e`)

This is the fastest way to reproduce “works end-to-end” locally, including auth and attachment uploads.

---

## 2.1) Publications & Reference IDs (share links)

Publishing a paper/diagram creates (or updates) a community post that powers the public gallery:

- Public gallery: `GET /gallery`
- Public publication page: `GET /p/:postId`
- Reference resolver (short, citation-friendly): `GET /r/:referenceId`

Reference IDs are minted on publish and are stable across re-publish. For details (format, resolver behavior, admin backfill), see:

- `packages/lastrevision/docs/reference-ids.md`

---

## 3) Manual local dev (when iterating UI/API)

From `packages/lastrevision`:

```bash
npm run dev
```

Then:

1. Open `http://localhost:3000/sign-up` and create a user.
2. Open `http://localhost:3000/dashboard/editor`.

If you hit `401` on `/api/my/*`, see §1.

---

## 3.1) AI provider + usage configuration (local)

SaaS AI mode is server-proxy only. Configure providers in `packages/lastrevision/.env`:

- Google provider key:
  - `GOOGLE_GENERATIVE_AI_API_KEY` (or `GEMINI_API_KEY` / `GOOGLE_API_KEY`)
- OpenRouter provider key:
  - `OPENROUTER_API_KEY`
  - optional `OPENROUTER_BASE_URL`

Daily hard caps are message-count based (not token-billing based):

- `AI_DAILY_LIMIT_FREE` (default `3`)
- `AI_DAILY_LIMIT_BASIC` (default `200`)
- `AI_DAILY_LIMIT_PRO` (default `1000`)

Quick API checks (after sign-in and obtaining bearer token):

- `GET /api/my/ai/settings` should return available models + `usageToday`.
- `PUT /api/my/ai/settings` with `{ "defaultModelId": "<id>" }` should persist a default model.
- `POST /api/my/ai/proxy` supports optional `selectedModelId` and `clientMessageId`.

---

## 4) Storage: which provider is used (GCS vs Cloudflare R2)

Storage is selected **on the backend** at runtime (Cloud Run or local dev server), not by GitHub Pages.

Selection logic lives in `packages/lastrevision/src/utils/storage/index.ts`:

- If `GCS_BUCKET` is set → use **Google Cloud Storage** (`GcsStorage`)
- Else → use **Cloudflare R2** (`R2Storage`)

### 4.1 What you’ll see in DevTools when uploading

Uploads use a **presigned PUT URL** (direct-to-object-store from the browser).

- GCS presigned URL looks like:
  - `https://storage.googleapis.com/<bucket>/<key>?X-Goog-...`
- R2 presigned URL looks like:
  - `https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?X-Amz-...`

The presigned URL host is the easiest way to confirm what provider is active.

### 4.2 “Production” (hotdocx.github.io + Cloud Run)

- SPA calls Cloud Run (configured via `VITE_API_BASE_URL` at build time).
- Cloud Run chooses storage based on its runtime env (`GCS_BUCKET` vs R2 vars).
- `scripts/deploy_lastrevision_cloudrun.sh` defaults `GCS_BUCKET` to `${GOOGLE_CLOUD_PROJECT}-uploads` if unset.

---

## 5) Attachment upload flow (why CORS matters)

Attachment upload is a two-step flow:

1. Browser (authorized) asks the API for a presigned URL:
   - `POST /api/my/uploads/presign` → `{ uploadUrl, key, contentType }`
2. Browser uploads the file directly to the object store:
   - `PUT <uploadUrl>` (this is cross-origin in both prod and local dev)

Because the browser does a **CORS preflight** (OPTIONS) before the PUT, the bucket must be configured with appropriate CORS rules.

### 5.1 Cloudflare R2 CORS (minimum for dev)

Your R2 bucket must allow:

- `OPTIONS` (preflight)
- `PUT` (upload)
- `AllowedHeaders` that match the browser’s request (dev-friendly: `["*"]`)
- Origins: `http://localhost:3000` and `https://hotdocx.github.io` (and `https://localhost:3000` only if you actually run HTTPS locally)

### 5.2 Google Cloud Storage CORS (minimum for prod)

Your GCS bucket must allow:

- `PUT` from `https://hotdocx.github.io`
- `PUT` from `http://localhost:3000` (for local testing against the same bucket, optional)
- Response headers: expose at least `ETag` if you read it client-side

---

## 6) Environment files: what is used where

LastRevision uses a mix of **Vite client env** (prefixed with `VITE_`) and **server runtime env** (plain).

### 6.1 Local development

- File: `packages/lastrevision/.env`
- Template: `packages/lastrevision/.env.example`
- Loaded by scripts via `dotenv -e .env -- ...` (see `packages/lastrevision/package.json` scripts).

### 6.2 Deployment defaults (not the source of truth)

- File: `packages/lastrevision/.env.production`
- Used as a *defaults file* by `scripts/deploy_lastrevision_cloudrun.sh` (it is `source`d).
- The deploy script may **derive additional env vars** (notably `GCS_BUCKET`) and inject them into Cloud Run.

### 6.3 Deployed runtime (source of truth)

Cloud Run env vars are the real truth at runtime.

To inspect them:

```bash
gcloud run services describe lastrevision-app --region us-central1 --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | "\(.name)=\(.value)"'
```

---

## 7) Remote validation (GitHub Pages + Cloud Run)

This checks the split-hosting setup end-to-end:

```bash
CLOUD_RUN_URL=https://<service>.run.app scripts/validate_lastrevision_remote.sh
```

Notes:
- Playwright runs against the GitHub Pages SPA (`PAGES_URL`, default `https://hotdocx.github.io`).
- Curl smoke runs against the Cloud Run backend using a bearer token captured by Playwright.

---

## 8) Security note for humans and agents

Do not paste or log secrets (Stripe keys, OAuth client secrets, R2 secrets, service account JSON).

If secrets were ever exposed outside this private repo, rotate them immediately.

---

## 9) Troubleshooting: `vega-canvas` / `canvas` build error

Symptom during `npm run -w packages/lastrevision build`:

- Rollup/Nitro fails to resolve `canvas` from `vega-canvas.node.js`.

Root cause:

- Server/SSR bundling accidentally includes browser preview modules that statically import `vega` / `vega-lite`.
- Under Node SSR conditions, `vega` resolves through `vega-canvas.node.js`, which references the optional native `canvas` package.

Current fix in repo:

- `packages/web/src/pipeline/commonMarkdownPipeline.tsx` uses SSR-gated lazy loading (`import.meta.env.SSR`) for Mermaid/Vega renderers.
- This prevents Node-side Nitro bundles from traversing `vega-canvas.node.js`.

If the error reappears:

1. Confirm the SSR-gated lazy import pattern is still present in `packages/web/src/pipeline/commonMarkdownPipeline.tsx`.
2. Run `npm run -w packages/lastrevision build` and verify success.
3. Search for new static server-reachable imports of `vega`/`vega-lite`/`mermaid` in shared web modules.
