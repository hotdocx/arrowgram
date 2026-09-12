# GetPaidX Codex Plugin

This public plugin connects Codex to the hosted GetPaidX MCP server at `https://getpaidx.com/api/mcp`.

After installing, use Codex's Connect flow or `codex mcp login getpaidx-cloud` to sign in to GetPaidX. The browser approval grants a short-lived OAuth token with only the scopes shown on the consent page. No GetPaidX PAT is required.

In the Codex App, open **Settings → MCP servers**, select `getpaidx-cloud`, and choose **Authenticate**. The gear beside `Getpaidx-cloud` on the plugin details page opens that server configuration. If the server already failed during startup, restart the App or open a new thread after authentication.

For the CLI, run the login command from a normal terminal outside the interactive Codex TUI:

```bash
codex mcp login getpaidx-cloud
```

Complete GetPaidX sign-in and consent in the browser, wait for the terminal success message, then start a new Codex CLI session. The App and CLI share the MCP configuration and stored OAuth connection on the same host.

The remote `getpaidx-cloud` connection deliberately has a distinct ID from the optional repo-local `getpaidx` PAT adapter, so both can be installed without one hiding the other.

The optional `getpaidx-local` marketplace from the private GetPaidX repository is only for developers testing the PAT-backed STDIO adapter. Hosted-plugin users should install `getpaidx@hotdocx` on this development host (or the public GetPaidX listing after publication), not `getpaidx@getpaidx-local`.

The first file, build, snapshot, or publish operation for a newly created cloud workspace can provision and bootstrap an Azure controller. The plugin allows up to five minutes for that cold path; later calls use the active controller and return normally.

The plugin exposes catalog-backed API discovery plus curated workflows for posts, public GitHub repository workspaces, conference peer-review setup and full review cycles, Live Room configuration and occurrences, participant moderation, persistent meeting chat, fixed-price Live Offers, policy-checked links to authenticated UI, Arrowgram workspaces, safe source edits, diffs, builds, snapshots, artifact-site publishing, and workspace closure. The repository flow lists built-in pools and current-user billing options, creates a DRAFT, configures runtime/access/billing, starts an edit session, performs a bounded depth-one public-GitHub clone, saves a snapshot, and returns a token-free preview handoff. Use workspace automation for bounded project commands; never seek controller credentials or a raw shell endpoint. Catalog workflows also cover general user-asset upload; binary signed-URL upload happens in the workspace/CLI rather than through the JSON-only raw MCP caller.

This plugin intentionally has one canonical remote MCP endpoint, `https://getpaidx.com/api/mcp`. Signed-in WebMCP tools on `getpaidx.com` and `lastrevision.pro` are independent same-origin browser surfaces with separate host cookies. The separate `getpaidx-lastrevision` repo/local plugin is an optional LastRevision-origin transport to the same shared backend and tool definitions; normally install one branded transport, not both. Existing OAuth grants must reconnect when they do not include place search or current-user organization discovery.

The portable CRM is a GetPaidX post-workspace template, not plugin-specific product logic. Queue it through the general workspace automation workflow; inside that workspace the canonical CRM package owns file state, scheduling ticks, Responses image generation, QR checks, and user-asset/share-email calls according to its capability profile.

The Live Sessions MCP surface is control-plane-only: it never returns raw media or persists RTC credentials. Interactive media handoff uses `getpaidx_get_live_session_ui_link`, and GetPaidX rechecks the signed-in identity, admission policy, occurrence state, and rollout gates when that normal post UI opens.
