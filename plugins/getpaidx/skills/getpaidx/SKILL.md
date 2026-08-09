---
name: getpaidx
description: Use hosted GetPaidX MCP tools to manage cloud posts, conference peer review, and Arrowgram workspaces after OAuth login.
---

# GetPaidX

Use this skill when the user asks Codex to automate GetPaidX posts, conference peer-review workflows, cloud workspaces, artifact publishing, or Arrowgram template workspaces.

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

The curated Arrowgram flow is:

1. Create or identify a GetPaidX post.
2. Start an edit workspace with `getpaidx_start_arrowgram_workspace`.
3. Read/write only `paper.md`, `paper.css`, `diagram.json`, or `arrowgram.workspace.json` through the source-file tools.
4. Inspect `getpaidx_workspace_source_diff`.
5. Run `getpaidx_build_arrowgram_workspace`.
6. Save a snapshot, publish the artifact site, then close the workspace when finished.

Do not edit generated `dist/` files. Do not call arbitrary URLs: the raw caller is intentionally limited to live catalog-approved routes. Mutating raw calls require `confirmMutating: true`.
