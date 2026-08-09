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

The plugin exposes catalog-backed API discovery plus curated workflows for posts, conference peer-review setup and full review cycles, Arrowgram workspaces, safe source edits, diffs, builds, snapshots, artifact-site publishing, and workspace closure.
