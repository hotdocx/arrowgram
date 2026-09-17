---
name: getpaidx
description: Use hosted GetPaidX MCP tools to browse professional Discover cards and manage cloud posts, public GitHub repository workspaces, conference peer review, Live Sessions, commerce, and Arrowgram workspaces after OAuth login.
---

# GetPaidX

Use this skill when the user asks Codex to browse or respond to GetPaidX Discover cards, or to automate GetPaidX posts, public GitHub repository workspaces, conference peer-review workflows, Live Sessions, fixed-price Live Offers, cloud workspaces, user assets/share email, artifact publishing, or Arrowgram/template workspaces.

## Authentication

The bundled MCP server uses the hosted `https://getpaidx.com/api/mcp` endpoint. Complete the GetPaidX OAuth login when Codex asks. Do not ask users to paste a personal access token for the normal plugin flow.

If the hosted tools are unavailable because OAuth is not connected, guide the user through either supported path:

- Codex App: open **Settings → MCP servers**, select `getpaidx-cloud`, and choose **Authenticate**. The gear beside `Getpaidx-cloud` on the plugin details page opens the same server configuration.
- Codex CLI: outside the interactive TUI, run `codex mcp login getpaidx-cloud`, finish GetPaidX sign-in and consent in the browser, and wait for the success message.

After an already-running App/CLI session reported MCP startup failure, restart that client or start a new thread so it initializes the repaired/authenticated server. The App and CLI share the same local MCP configuration and OAuth credential store on the same Codex host.

Current hosted consent includes `places:read` for place search/resolve and `organizations:read` for the signed-in user's eligible organization billing accounts. Reconnect an older grant that lacks either scope. The optional `getpaidx-lastrevision` repo/local plugin provides the same tools through a separate LastRevision-origin OAuth resource; normally use one branded transport per thread.

## Tool Strategy

Prefer curated tools for known workflows. Use `getpaidx_catalog_search`, `getpaidx_catalog_get_endpoint`, and `getpaidx_catalog_get_workflow` before the raw `getpaidx_api_call` escape hatch.

For conversational Discover:

1. Call `getpaidx_discover_next` for one minimized professional card. Apply only filters the user supplied or approved; do not invent durable preferences.
2. Summarize the returned card from its structured fields. If inline UI is unavailable, provide its details/cover links as ordinary clickable fallbacks.
3. Wait for an explicit decision. Sentiment or a positive remark alone is not a PASS, SAVED, or INTERESTED instruction.
4. Use `getpaidx_discover_decide` with `PASS` or `SAVED` only when requested; both remain private and undoable in Discover.
5. Before `INTERESTED`, show or obtain the exact reply title and body and get explicit confirmation. Then send those exact fields with `confirmInterest: true`. Never invent and silently send the message.
6. Report the authoritative receipt, including moderation state. Interest creates one idempotent normal reply; it does not buy a priced post or grant workspace access.
7. Fetch another card only when the user asks for the next card or explicitly requests a repeated browse loop. Do not reset or erase prior decisions to keep a loop running.

The curated public-GitHub repository workspace flow is:

1. Inspect `github_repository_workspace`, then call `getpaidx_list_workspace_pools`. Select a configured built-in pool and allowed workload profile; for LambdaPi use `lambdapi` plus its advertised `standard` profile. Do not apply `lambdapi_cli` merely to select the LambdaPi runtime.
2. Create an ordinary `DRAFT` with `getpaidx_create_post`. A repository README extract can be used as Markdown body text, up to the tool's current 20,000-character limit.
3. Configure the owned post with `getpaidx_update_workspace_config`. Runtime commands belong in `runtimeConfig`; explicit collaborators use `editUserIds`, `editUserEmails`, or audience tags. Use `getpaidx_list_workspace_billing_options` before choosing an eligible organization billing account. Organization membership does not itself grant workspace or peer-review access.
4. Start an `EDIT` workspace with `getpaidx_start_workspace`, then pass its session ID and a canonical public `https://github.com/{owner}/{repo}` URL to `getpaidx_clone_github_repository`. The operation replaces the existing project with a bounded depth-one checkout, does not initialize submodules, and may queue a configured live-runtime restart after the checkout commits.
5. Save with `getpaidx_save_workspace_snapshot`. For repository-specific terminal work, inspect catalog workflow `run_workspace_automation` and queue a bounded Codex prompt rather than seeking controller credentials or a raw shell endpoint.
6. Use the returned token-free `previewUrl` for an authenticated browser handoff when the configured live server is ready. Close only the created session with `getpaidx_close_workspace` when finished.
7. If requested, independently enable conference review on the same post with `getpaidx_bootstrap_peer_review_conference`. Conference roles do not silently change the explicit workspace collaborator or billing configuration.

Repository cloning is V1 public-GitHub-only and destructive to the current workspace project. Do not manufacture alternate clone hosts, embedded credentials, submodule steps, symbolic-link exceptions, or raw controller/session tokens. The canonical plugin MCP endpoint stays `getpaidx.com`; same-origin WebMCP on signed-in `getpaidx.com` and `lastrevision.pro` pages is a separate browser surface and uses independent host cookies.

For a task that must run inside an owned post workspace, inspect catalog workflow `run_workspace_automation`. Use the catalog-approved raw caller to POST a bounded Codex prompt plus stable idempotency key to `/api/workspace/automations/runs`, then GET `/api/workspace/automations/runs/{runId}` until terminal. The prompt may request terminal commands inside the workspace; never look for a raw controller-shell endpoint, send controller credentials, or pass plaintext secret overrides.

For the `getpaidx_crm_workspace` template, ask the workspace run to use the installed `npm run crm -- ...` commands and its independent project `data/` state. Workspace image generation uses `npm run crm -- art generate`, which calls OpenAI's built-in Responses `image_generation` tool through the authenticated GetPaidX proxy and writes under the active `CODEX_HOME`; do not assume the controller Codex CLI directly exposes `image_gen`, start a nested Codex process, or ask for an API key.

When the live catalog exposes `upload_user_asset`, use it for caller-owned PNG/JPEG/WebP/PDF hosting. The signed Blob URL accepts the declared bytes only and must not be logged or persisted. The generic MCP JSON caller cannot PUT local binary bytes to that external URL, so perform the upload inside an authorized GetPaidX workspace/CLI or queue a workspace automation to do it. A committed `PUBLIC` or `UNLISTED` image can then be passed as `imageAssetId` to `/api/share/email-invitations`; GetPaidX verifies ownership and renders safe email HTML. Do not submit arbitrary image URLs or HTML.

The curated conference peer-review flow is:

1. Create or identify an owned top-level CFP post, then use `getpaidx_bootstrap_peer_review_conference` and `getpaidx_update_peer_review_conference`.
2. Invite explicit chair, PC, or reviewer roles with `getpaidx_invite_peer_reviewer`; use catalog-backed role, track, and stage endpoints for advanced setup.
3. Create a submission with `getpaidx_create_peer_review_submission`.
4. As chair/PC, assign an explicitly granted reviewer with `getpaidx_assign_peer_reviewer`; as that reviewer, submit with `getpaidx_create_peer_review`.
5. As chair/PC, call `getpaidx_record_peer_review_decision`, publish with `getpaidx_publish_peer_review_proceedings`, and verify `getpaidx_get_peer_review_dashboard_summary`.

Inspect the `peer_review_conference_setup` and `peer_review_full_cycle` catalog workflows for exact step order. Setup/invitations/submission creation/dashboard use the CFP post ID; assignments/reviews/decisions/proceedings use the returned submission post ID. OAuth tokens do not impersonate another conference actor. Organization sponsorship provides billing only and never grants peer-review access.

Treat both `CHAIR` and `PC` as conference-management roles. In `DOUBLE_BLIND`, reviewer-facing submission reads intentionally return `authorIdentityVisible: false` and a null author ID/object; `SINGLE_BLIND` exposes the submitter. Review posts are directly readable only by their reviewer-author or CHAIR/PC managers, and redacted review-list IDs must remain null. Never attempt to recover hidden identities through generic post routes.

The curated Live Sessions flow is:

1. Inspect/install/configure a post room with `getpaidx_get_live_room`, `getpaidx_bootstrap_live_room`, and `getpaidx_update_live_room`.
2. Schedule/read/reschedule an occurrence with `getpaidx_list_live_sessions`, `getpaidx_create_live_session`, `getpaidx_get_live_session`, and `getpaidx_update_live_session`; start/end it only as an authorized manager.
3. Use `getpaidx_list_live_session_messages` and `getpaidx_send_live_session_message` as the current admitted OAuth principal. Use participant update/remove tools only for non-host moderation.
4. Use `getpaidx_get_live_session_ui_link` for the authenticated overview, media, chat, or offer handoff. It returns product IDs and a post link, never an RTC credential; browser admission and feature gates are checked again.
5. For an enabled `LIVE_COMMERCE` occurrence, create/update/activate/end a Live Offer against an existing authoritative one-time priced post. Never override price, currency, seller, or revenue shares, and never activate commerce for a double-blind submission.

Inspect `live_session_setup`, `live_session_conversation`, and `live_offer_fixed_price` for exact sequencing. Live Sessions and live commerce are independently optional and may be paused; do not bypass an unavailable response, query an RTC provider directly, or use OAuth as impersonation.

The curated Arrowgram flow is:

1. Create or identify a GetPaidX post.
2. Start an edit workspace with `getpaidx_start_arrowgram_workspace`.
3. Read/write only `paper.md`, `paper.css`, `diagram.json`, or `arrowgram.workspace.json` through the source-file tools.
4. Inspect `getpaidx_workspace_source_diff`.
5. Run `getpaidx_build_arrowgram_workspace`.
6. Save a snapshot, publish the artifact site, then close the workspace when finished.

Do not edit generated `dist/` files. Do not call arbitrary URLs: the raw caller is intentionally limited to live catalog-approved routes. Mutating raw calls require `confirmMutating: true`.
