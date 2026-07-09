---
name: getpaidx
description: Use hosted GetPaidX MCP tools to manage cloud posts and Arrowgram workspaces after OAuth login.
---

# GetPaidX

Use this skill when the user asks Codex to automate GetPaidX posts, cloud workspaces, artifact publishing, or Arrowgram template workspaces.

## Authentication

The bundled MCP server uses the hosted `https://getpaidx.com/api/mcp` endpoint. Complete the GetPaidX OAuth login when Codex asks. Do not ask users to paste a personal access token for the normal plugin flow.

## Tool Strategy

Prefer curated tools for known workflows. Use `getpaidx_catalog_search`, `getpaidx_catalog_get_endpoint`, and `getpaidx_catalog_get_workflow` before the raw `getpaidx_api_call` escape hatch.

The curated Arrowgram flow is:

1. Create or identify a GetPaidX post.
2. Start an edit workspace with `getpaidx_start_arrowgram_workspace`.
3. Read/write only `paper.md`, `paper.css`, `diagram.json`, or `arrowgram.workspace.json` through the source-file tools.
4. Inspect `getpaidx_workspace_source_diff`.
5. Run `getpaidx_build_arrowgram_workspace`.
6. Save a snapshot, publish the artifact site, then close the workspace when finished.

Do not edit generated `dist/` files. Do not call arbitrary URLs: the raw caller is intentionally limited to live catalog-approved routes. Mutating raw calls require `confirmMutating: true`.
