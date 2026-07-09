# LastRevision (SaaS) Local Dev, Testing, and Storage

This SOP documents how to run and validate the private SaaS app (`packages/lastrevision`) **locally** (no GitHub Pages / remote backend deploy) and how storage is selected across local vs deployed environments.

If you are an AI agent starting from the repo root, start here after reading `AGENTS.md`.

---

## 0) Mental model (split hosting)

LastRevision is deployed in **split-hosting** mode:

- **Frontend (static SPA):** `https://hotdocx.github.io/`
- **Backend (API):** Azure Container Apps for the GetPaidX-shared Azure migration target. The legacy Cloud Run deployment remains useful as rollback/reference until GCP is fully disabled.

Locally, both frontend and backend run on the same dev origin:

- `http://localhost:3000`

See also:
- `packages/lastrevision/docs/deploy.md`
- `packages/lastrevision/docs/reference-ids.md` (publication reference IDs)
- `reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md` (current validation/deployment map)

---

## 1) Auth: why `/api/my/*` returns 401

Most LastRevision “my” endpoints are protected:

- `/api/my/papers`, `/api/my/diagrams`, `/api/my/attachments`, `/api/my/uploads/*`, `/api/my/ai/proxy`, …
- `/api/my/ai/settings`

LastRevision intentionally uses **bearer token auth** (not cookies) so split hosting works reliably.

- The client stores the bearer token in `localStorage` under key `hotdocx_bearer_token`.
- Token persistence accepts both auth response header (`set-auth-token`) and JSON token payloads.
- Requests include `Authorization: Bearer <token>`.
- If `hotdocx_bearer_token` is missing/empty/invalid, the backend returns `401 Unauthorized`.
- Primary sign-in UX is email OTP plus Google Identity Services button / One Tap.

See: `packages/lastrevision/docs/authentication.md`.

### 1.1 Common local dev gotcha: stale token after DB reset

If you reset the dev DB or change `BETTER_AUTH_SECRET`, any existing token in `localStorage` may become invalid.

Fix:
- Delete `hotdocx_bearer_token` from browser localStorage.
- Re-run `/sign-in` or `/sign-up`.
- Confirm `hotdocx_bearer_token` is recreated before testing `/dashboard/editor`.

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

1. Open `http://localhost:3000/`, `http://localhost:3000/sign-in`, or `http://localhost:3000/sign-up`.
2. Sign in with email OTP or Google.
3. Open `http://localhost:3000/dashboard/editor`.

If you hit `401` on `/api/my/*`, see §1.

---

### 3.1) Local auth env checklist

At minimum, configure these in `packages/lastrevision/.env`:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_SIGNIN_ALLOWED_HOSTS=localhost,127.0.0.1,hotdocx.github.io`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

For OTP email delivery via ACS:

- `ACS_EMAIL_CONNECTION_STRING`
- `ACS_EMAIL_ENDPOINT`
- `ACS_EMAIL_SENDER_ADDRESS`
- optional `ACS_EMAIL_MANAGED_IDENTITY_CLIENT_ID`

For easier local/test iteration:

- `AUTH_AUTO_VERIFY_EMAIL=true`
- `TEST_OTP_BYPASS_CODE=123456`

If ACS is not available, local and E2E validation can still fetch the plain OTP through Better Auth's dev endpoint when OTP storage is plain:

- `GET /api/auth/email-otp/get-verification-otp?email=<email>&type=sign-in`

---

## 3.2) AI provider + usage configuration (local)

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

## 4) Landing page and paid booking flow

The main public landing page is `/`. It now includes:

- guided `1-on-1` setup framing
- one intro Vimeo video and three testimonial Vimeo embeds
- Dubai AI community proof image
- pricing CTAs that hand off into booking

Paid checkout behavior:

- success: `/dashboard/calendar?checkout=success&book=1&plan=<plan>`
- cancel: `/dashboard/settings?checkout=canceled`

Calendar behavior:

- any signed-in user can create a public `appointment-request`
- default duration is one hour
- no scheduling conflict checks are enforced
- owners can edit/delete their own requests; admins can manage all

## 5) Storage: which provider is used (Azure Blob vs GCS vs Cloudflare R2)

Storage is selected **on the backend** at runtime (Azure Container Apps, legacy Cloud Run, or local dev server), not by GitHub Pages.

Selection logic lives in `packages/lastrevision/src/utils/storage/index.ts`:

- If `AZURE_STORAGE_CONNECTION_STRING` is set → use **Azure Blob Storage** (`AzureBlobStorage`)
- Else if `GCS_BUCKET` is set → use **Google Cloud Storage** (`GcsStorage`)
- Else → use **Cloudflare R2** (`R2Storage`)

### 5.1 What you’ll see in DevTools when uploading

Uploads use a **presigned PUT URL** (direct-to-object-store from the browser).

- Azure Blob SAS URL looks like:
  - `https://<account>.blob.core.windows.net/<container>/<key>?sv=...`
- GCS presigned URL looks like:
  - `https://storage.googleapis.com/<bucket>/<key>?X-Goog-...`
- R2 presigned URL looks like:
  - `https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?X-Amz-...`

The presigned URL host is the easiest way to confirm what provider is active.

### 5.2 “Production” (hotdocx.github.io + Azure Container Apps)

- SPA calls the backend configured via `VITE_API_BASE_URL` at build time.
- Azure Container Apps chooses storage based on runtime env. For the GetPaidX-shared Azure deployment, set `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER_NAME`.
- `scripts/deploy_lastrevision_azure.sh` creates/uses the `lastrevision-uploads` container by default.

---

## 6) Attachment upload flow (why CORS matters)

Attachment upload is a two-step flow:

1. Browser (authorized) asks the API for a presigned URL:
   - `POST /api/my/uploads/presign` → `{ uploadUrl, key, contentType }`
2. Browser uploads the file directly to the object store:
   - `PUT <uploadUrl>` (this is cross-origin in both prod and local dev)

Because the browser does a **CORS preflight** (OPTIONS) before the PUT, the bucket must be configured with appropriate CORS rules.

### 6.1 Cloudflare R2 CORS (minimum for dev)

Your R2 bucket must allow:

- `OPTIONS` (preflight)
- `PUT` (upload)
- `AllowedHeaders` that match the browser’s request (dev-friendly: `["*"]`)
- Origins: `http://localhost:3000` and `https://hotdocx.github.io` (and `https://localhost:3000` only if you actually run HTTPS locally)

### 6.2 Azure Blob CORS (minimum for prod)

The Azure Blob service must allow:

- `OPTIONS`
- `PUT`
- `GET`
- origins: `https://hotdocx.github.io`, `http://localhost:3000`, and `http://localhost:5173`
- allowed/exposed headers: `*`

The Azure storage adapter attempts to apply this rule from `AZURE_STORAGE_BLOB_ALLOWED_ORIGINS` on first use.

### 6.3 Google Cloud Storage CORS (legacy/rollback)

Your GCS bucket must allow:

- `PUT` from `https://hotdocx.github.io`
- `PUT` from `http://localhost:3000` (for local testing against the same bucket, optional)
- Response headers: expose at least `ETag` if you read it client-side

---

## 7) Environment files: what is used where

LastRevision uses a mix of **Vite client env** (prefixed with `VITE_`) and **server runtime env** (plain).

### 7.1 Local development

- File: `packages/lastrevision/.env`
- Template: `packages/lastrevision/.env.example`
- Loaded by scripts via `dotenv -e .env -- ...` (see `packages/lastrevision/package.json` scripts).

### 7.2 Deployment defaults (not the source of truth)

- File: `packages/lastrevision/.env.production`
- Used as a *defaults file* by deployment scripts such as `scripts/deploy_lastrevision_azure.sh` and the legacy `scripts/deploy_lastrevision_cloudrun.sh`.
- The legacy Cloud Run deploy script may **derive additional env vars** (notably `GCS_BUCKET`) and inject them into Cloud Run.

### 7.3 Deployed runtime (source of truth)

Cloud runtime env vars are the real truth at runtime.

For Azure Container Apps, inspect names without printing secret values:

```bash
az containerapp show --name lastrevision-app --resource-group getpaidx-staging-rg \
  --query 'properties.template.containers[0].env[].name'
```

For the legacy Cloud Run deployment, inspect with:

To inspect them:

```bash
gcloud run services describe lastrevision-app --region us-central1 --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | "\(.name)=\(.value)"'
```

---

## 8) Remote validation (GitHub Pages + ACA backend)

This checks the split-hosting setup end-to-end:

```bash
API_BASE_URL=https://<aca-app>.azurecontainerapps.io \
SMOKE_ORIGIN=https://hotdocx.github.io \
SMOKE_OTP_GMAIL_ACCOUNT=1337777.ooo@gmail.com \
scripts/smoke_lastrevision.sh
```

Notes:
- Playwright runs against the GitHub Pages SPA (`PAGES_URL`, default `https://hotdocx.github.io`).
- Curl smoke runs against the ACA backend and can retrieve production email OTPs through `gog`.
- Use `1337777.ooo@gmail.com` as the default OTP smoke inbox for migration validation.
- Other authenticated `gog` Gmail accounts available for dev/test inbox workflows are `getpaidx.com@gmail.com`, `lastrevision.pro@gmail.com`, and `re365.net@gmail.com`.
- Playwright global setup now signs in via email OTP, so remote validation must have working ACS delivery, `TEST_OTP_BYPASS_CODE`, or a `gog` OTP retrieval strategy.

---

## 9) Security note for humans and agents

Do not paste or log secrets (Stripe keys, OAuth client secrets, ACS credentials, R2 secrets, service account JSON).

If secrets were ever exposed outside this private repo, rotate them immediately.

---

## 10) Troubleshooting: `vega-canvas` / `canvas` build error

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
