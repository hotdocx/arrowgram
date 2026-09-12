# OSS Mirroring SOP (Private Super-Repo → Public Repo)

This repository is intended to be a **private super-repo** containing both:

- OSS code (`packages/arrowgram`, `packages/web`, `packages/paged`, `packages/agent`, docs), and
- private SaaS code (`packages/lastrevision`).

The OSS subset is mirrored into a **public repo** (e.g. `github.com/hotdocx/arrowgram`).

For the current deployment and validation overview, see `reports/CURRENT_OPERATIONS_TESTING_DEPLOYMENT_2026-07-08.md`.

## Remote model (in this private super-repo clone)

- `origin` -> private super-repo (`hotdocx/arrowgram-super`)
- `public` -> OSS mirror repo (`hotdocx/arrowgram`)

## Goals

- Prevent any private code or secrets from leaking to the public repo.
- Make OSS releases repeatable and scriptable.
- Keep developer workflow “one repo locally”.

## Export workflow (manual inspection)

1. Ensure the working tree is clean:
   - `git status --porcelain`
2. Export allowlisted paths:
   - `scripts/export_oss.sh /tmp/arrowgram-oss-export`
3. Validate the exported tree and regenerated public-only lockfile before publication. Prefer the guarded sync command below for the actual commit/push; do not directly force-push public `main`.

## Recommended workflow (scripted)

From the private super-repo working tree:

1. Require a clean local `main`, confirm `origin` is private `hotdocx/arrowgram-super` and `public` is public `hotdocx/arrowgram`, then push private source normally:
   - `git push origin main`
2. Generate the exact allowlisted export, validate the public repository identity, and inspect the proposed public diff without mutation:
   - `scripts/sync_public_oss.sh`
3. After reviewing the printed private source/public base pair and diff, publish with a normal fast-forward push:
   - `scripts/sync_public_oss.sh --apply`
4. Deploy OSS artifacts to public `gh-pages` only when the web/paged build changed:
   - `scripts/deploy_arrowgram_pages.sh`

## Tags

- For coordinated OSS npm releases, prefer a single repo-level annotated tag such as `oss-npm-v1.0.0`.
- Create and push the private tag from the private super-repo as usual:
  - `git tag -a oss-npm-v1.0.0 -m "..."`
  - `git push origin oss-npm-v1.0.0`
- Do **not** push that same tag object directly to the public repo.
- Instead, create the same tag name on the **public mirror's `main` commit** from a clean clone of the public repo, then push it there.
- Reason: a tag created in the private super-repo points into private history; GitHub may reject pushing that tag to the public repo because the tag object references commits that are outside the public mirror and may trip repository rules or secret scanning.
- The private and public tags may share the same name, but each must point to the commit history of its own repo.

## Allowlist

The export script uses an explicit allowlist. If a new OSS workspace is added, update the allowlist in:

- `scripts/export_oss.sh`

## Safety notes

- Never allowlist `packages/lastrevision/**`.
- Never allowlist `.env*` or build outputs (e.g. `.output`, `dist`, `node_modules`).
- Never export generated metadata artifacts that can capture private-repo paths or diagnostics (for example `*.tsbuildinfo`).
- Public `main` updates must be ordinary fast-forward commits. A concurrent update is a stop/review condition, not a reason to force-push.
- Consider running a quick grep in the export dir for common secret prefixes before pushing.
- Since `.github/` is allowlisted, keep GitHub Actions workflows compatible with both:
  - the private super-repo (has `packages/lastrevision`)
  - the OSS public repo (does **not** have `packages/lastrevision`)
  This is implemented by guarding LastRevision steps with `if [ -d packages/lastrevision ]; then ...; fi`.
