---
name: getpaidx-lastrevision
description: Use the LastRevision.pro OAuth origin for hosted GetPaidX MCP tools that browse professional Discover cards and manage posts, public GitHub repository workspaces, conference peer review, Live Sessions, commerce, and Arrowgram workspaces.
---

# GetPaidX — LastRevision.pro

Use this skill for the same GetPaidX product workflows as the canonical GetPaidX plugin when the user selected the LastRevision.pro-branded OAuth origin.

## Authentication and domain boundary

The bundled server is `getpaidx-lastrevision-cloud` at `https://lastrevision.pro/api/mcp`. Complete its OAuth login when prompted, or run `codex mcp login getpaidx-lastrevision-cloud` outside the interactive CLI. Never ask for a personal access token for this hosted flow.

The LastRevision and GetPaidX hosts share the GetPaidX API implementation and account database, but their OAuth clients, resource identifiers, access/refresh tokens, consent grants, and browser cookies are origin-specific. Do not reuse or copy credentials across origins. After login or plugin reinstall, start a new Codex thread so its MCP connection uses the refreshed token.

## Tool strategy

Prefer curated tools for known workflows. Use catalog workflow/endpoint discovery before the raw `getpaidx_api_call`; the raw caller may call only catalog-approved routes, and mutations require explicit confirmation.

For conversational Discover, call `getpaidx_discover_next` for one minimized card and apply only user-supplied filters. Wait for an explicit decision before calling `getpaidx_discover_decide`. `PASS` and `SAVED` are private. For `INTERESTED`, first show or obtain the exact reply title and body, require explicit confirmation, then send those exact fields with `confirmInterest: true`. Report the moderation receipt; interest is an idempotent normal reply, not checkout or workspace access. Fetch another card only when the user asks or explicitly requests a repeated browsing loop.

For a public GitHub repository workspace:

1. Inspect `github_repository_workspace`, list workspace pools, and select the declared workload. For LambdaPi use pool `lambdapi` with its `standard` profile; do not apply the `lambdapi_cli` template merely to choose that pool.
2. Create a DRAFT post. Markdown bodies currently accept up to 20,000 characters.
3. Configure runtime, live-server command, collaborator access, purchase gates, and billing defaults with the workspace-config tool. Discover only the current user's eligible organization billing accounts; organization membership does not itself grant workspace or peer-review access.
4. Start an EDIT workspace, then use the repository-clone tool with a canonical public `https://github.com/{owner}/{repo}` URL. The checkout is bounded and depth one, replaces the current project, and does not initialize submodules.
5. Save a snapshot. For terminal work, inspect `run_workspace_automation` and queue a bounded prompt plus stable idempotency key; never seek a controller credential or raw shell API.
6. Hand off the returned token-free preview URL. Close only the intended session when finished.
7. Independently enable conference peer review if requested. Conference roles never silently become workspace roles.

For broader operations, use the matching catalog workflows for conference review, Live Sessions, Live Offers, user assets/share email, CRM templates, or Arrowgram file/build/publish operations. Respect double-blind identity redaction, sellable-post price authority, RTC credential boundaries, source-file allowlists, and workspace secret bindings.

Do not install both branded transports merely to combine permissions: their tools are intentionally equivalent, while their OAuth grants remain independent.
