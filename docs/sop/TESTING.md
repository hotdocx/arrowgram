# Testing & Validation Strategy

## 1. Philosophy
We employ a **testing pyramid** strategy:
1.  **Unit Tests (Base):** Fast, numerous tests for core logic and math.
2.  **Integration Tests (Middle):** Testing component interactions and state management.
3.  **E2E/Visual Tests (Top):** Validating the final rendered output and critical user flows.

**Important:** If the JSON Schema (`packages/arrowgram/src/types.ts`) is updated, ensure that `docs/ARROWGRAM_SPEC.md` is updated and that new tests are added to verify the new schema capabilities (e.g., in `visual.spec.ts` or `styles.spec.ts`).

## 2. Core Library Testing (`packages/arrowgram`)
*   **Tool:** **Vitest**
*   **Scope:** Geometry math, intersection logic, schema validation.
*   **Files:** `*.test.ts`, `*.test.js` alongside source files.
*   **Key Tests:**
    *   `src/diagramModel.test.js`: Verifies that JSON specs are correctly parsed into computed models.
    *   `src/core/arrowTransforms.test.ts`: Verifies arrow geometry logic.
    *   `src/core/shorten.test.ts`: Verifies arrow shortening logic.
    *   *TODO:* Add specific math tests for `curve.ts` (bezier length, intersections).

## 3. Web App Testing (`packages/web`)
*   **Tools:** **Jest** (Unit) and **Playwright** (E2E).

### 3.1. Unit/Integration (Jest)
*   **Scope:** React components, hooks, utility functions.
*   **Command:** `npm test --workspace=packages/web`

### 3.2. End-to-End & Visual (Playwright)
*   **Scope:** Rendering correctness, browser interaction, visual regression.
*   **Configuration:** `packages/web/playwright.config.ts`
*   **Tests:** Located in `packages/web/e2e/`.
    *   `visual.spec.ts`: Checks basic rendering (e.g., "does a curved arrow actually curve?").
    *   `styles.spec.ts`: specifically verifies advanced arrow styles (Adjunction, Proarrow, Bullet) by inspecting SVG path attributes.
    *   `attachments.spec.ts`: exercises OSS IndexedDB “workspace files” (upload/download/delete).
*   **Running:**
    ```bash
    npm run test:e2e --workspace=packages/web
    ```
    *Note: The test runner handles starting the dev server automatically.*

## 4. Continuous Integration (CI)
*   **Platform:** GitHub Actions (`.github/workflows/ci.yml`).
*   **Workflow:**
    1.  Install dependencies.
    2.  Build Core.
    3.  Run Core Tests (Vitest).
    4.  Build Web.
    5.  *TODO:* Add E2E tests to CI (requires headless browser setup).

## 5. Adding New Tests
*   **New Math Logic:** Add a unit test in `packages/arrowgram`.
*   **New UI Feature:** Add a component test in `packages/web`.
*   **New Rendering Style:** Add a case to `packages/web/e2e/styles.spec.ts` to ensure it renders visible SVG elements distinct from default lines.

## 6. LastRevision (SaaS) Validation

LastRevision (`packages/lastrevision`) is validated via **curl smoke** + **Playwright E2E** at the repo root.

For the full “how to run locally / why 401 happens / storage (GCS vs R2) / env files” guide, see:

- `docs/sop/LASTREVISION_LOCAL_DEV.md`

### 6.1 Local

Runs docker Postgres, migrations, curl smoke (incl. AI proxy), and Playwright:

```bash
scripts/validate_lastrevision_local.sh
```

### 6.2 Deployed (GitHub Pages + Cloud Run)

Runs Playwright against `https://hotdocx.github.io` and then a Cloud Run backend smoke using the same bearer token (to avoid auth rate limits):

```bash
CLOUD_RUN_URL=https://<service>.run.app scripts/validate_lastrevision_remote.sh
```

Note: remote Playwright runs intentionally use low concurrency to reduce flakiness against GitHub Pages + Cloud Run.

Note: some SaaS E2E tests mock the attachment download proxy endpoint to keep the “AI tool → attach file-part → auto-resubmit” flow deterministic and not dependent on external object storage availability.

### 6.3 Smoke script knobs

`scripts/smoke_lastrevision.sh` supports a few environment overrides:

- `SMOKE_ORIGIN=https://hotdocx.github.io` to test true split-origin CORS behavior
- `SMOKE_TOKEN=<bearer-token>` to skip `sign-up` and reuse an existing token
- `SMOKE_AI=0` to skip `/api/my/ai/proxy` streaming validation

The smoke script also validates the “workspace files” flow by creating a project attachment via `POST /api/my/attachments`, uploading to the returned presigned URL, and then reading it back via `GET /api/my/uploads/url`.
