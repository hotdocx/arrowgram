# GetPaidX Codex Plugin

This public plugin connects Codex to the hosted GetPaidX MCP server at `https://getpaidx.com/api/mcp`.

After installing, use Codex's Connect flow or `codex mcp login getpaidx-cloud` to sign in to GetPaidX. The browser approval grants a short-lived OAuth token with only the scopes shown on the consent page. No GetPaidX PAT is required.

The remote `getpaidx-cloud` connection deliberately has a distinct ID from the optional repo-local `getpaidx` PAT adapter, so both can be installed without one hiding the other.

The plugin exposes catalog-backed API discovery plus curated workflows for posts, Arrowgram workspaces, safe source edits, diffs, builds, snapshots, artifact-site publishing, and workspace closure.
