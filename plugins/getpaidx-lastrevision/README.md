# GetPaidX — LastRevision.pro Codex Plugin

This public-repository plugin connects Codex to `https://lastrevision.pro/api/mcp`. It is a branded transport to the same GetPaidX API backend and the same MCP tool definitions as the canonical `getpaidx` plugin; it does not fork product logic.

Install either plugin according to the OAuth origin you want to see and authorize:

- `getpaidx@hotdocx` uses `https://getpaidx.com/api/mcp` and server ID `getpaidx-cloud`.
- `getpaidx-lastrevision@hotdocx` uses `https://lastrevision.pro/api/mcp` and server ID `getpaidx-lastrevision-cloud`.

The two origins use independent OAuth clients, grants, tokens, and browser cookies even when they resolve to the same GetPaidX account in the shared backend. Installing both is supported for qualification, but normally choose one to avoid duplicate tool names in an agent session.

After installation, use Codex's Connect flow or run this outside the interactive CLI:

```bash
codex mcp login getpaidx-lastrevision-cloud
```

Complete LastRevision sign-in and consent in the browser, wait for terminal success, and then start a new Codex thread. The requested scopes cover posts, places, artifacts, sharing, workspace execution/management, and discovery of the current user's eligible organization billing accounts.

The repository-workspace flow can create a post, select a built-in pool and workload, configure access/billing/runtime policy, start a workspace, make a bounded depth-one clone of a public GitHub repository, run a guarded workspace automation, save a snapshot, and return a token-free preview handoff. Conference peer review and Live Sessions remain independent optional extensions.

The OpenAI universal public-directory listing remains the canonical GetPaidX plugin by default. This LastRevision variant is independently installable from the Hotdocx repo/local marketplace and can be submitted separately later if its distinct branded listing, domain verification, review credentials, test cases, and product differentiation are worthwhile.
