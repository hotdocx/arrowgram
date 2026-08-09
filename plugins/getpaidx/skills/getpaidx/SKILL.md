---
name: getpaidx
description: Use hosted GetPaidX MCP tools to manage cloud posts, conference peer review, Live Sessions, commerce, and Arrowgram workspaces after OAuth login.
---

# GetPaidX

Use this skill when the user asks Codex to automate GetPaidX posts, conference peer-review workflows, Live Sessions, fixed-price Live Offers, cloud workspaces, artifact publishing, or Arrowgram template workspaces.

## Authentication

The bundled MCP server uses the hosted `https://getpaidx.com/api/mcp` endpoint. Complete the GetPaidX OAuth login when Codex asks. Do not ask users to paste a personal access token for the normal plugin flow.

If the hosted tools are unavailable because OAuth is not connected, guide the user through either supported path:

- Codex App: open **Settings → MCP servers**, select `getpaidx-cloud`, and choose **Authenticate**. The gear beside `Getpaidx-cloud` on the plugin details page opens the same server configuration.
- Codex CLI: outside the interactive TUI, run `codex mcp login getpaidx-cloud`, finish GetPaidX sign-in and consent in the browser, and wait for the success message.

After an already-running App/CLI session reported MCP startup failure, restart that client or start a new thread so it initializes the repaired/authenticated server. The App and CLI share the same local MCP configuration and OAuth credential store on the same Codex host.

## Tool Strategy

Prefer curated tools for known workflows. Use `getpaidx_catalog_search`, `getpaidx_catalog_get_endpoint`, and `getpaidx_catalog_get_workflow` before the raw `getpaidx_api_call` escape hatch.

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
