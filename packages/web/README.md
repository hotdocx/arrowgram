# `@hotdocx/arrowgram-web`

Embeddable Arrowgram workspace and paper-editor components for React apps.

This package is the reusable UI layer on top of `@hotdocx/arrowgram`. It exposes:

- `@hotdocx/arrowgram-web/embed` for the full workspace and paper editor
- `@hotdocx/arrowgram-web/adapters` for local, LastRevision-style, and file-bridge repositories
- `@hotdocx/arrowgram-web/preview` for paper preview components
- `@hotdocx/arrowgram-web/ai` for the built-in AI tool definitions

## Install

```bash
npm install @hotdocx/arrowgram-web @hotdocx/arrowgram react react-dom
```

## Example

```tsx
import { ArrowgramWorkspaceApp } from "@hotdocx/arrowgram-web/embed";

export function App() {
  return <ArrowgramWorkspaceApp />;
}
```

`ArrowgramWorkspaceApp` uses local IndexedDB persistence by default. Pass custom repositories if your host app needs remote storage, attachment backends, or a file-backed coding-agent workspace.

## File-Backed Workspaces

`createWorkspaceBridgeProjectRepository` connects the React editor to an `arrowgram-agent` bridge server. In this mode paper Markdown, paper CSS, and diagram JSON are watched files on disk, so Codex CLI, terminal editors, scripts, and the browser editor all update the same source of truth.

```tsx
import "@hotdocx/arrowgram-web/dist/arrowgram-web.css";
import { ArrowgramWorkspaceApp } from "@hotdocx/arrowgram-web/embed";
import { createWorkspaceBridgeProjectRepository } from "@hotdocx/arrowgram-web/adapters";

const repository = createWorkspaceBridgeProjectRepository({
  baseUrl: window.location.origin,
});

export function App() {
  return <ArrowgramWorkspaceApp repository={repository} />;
}
```

The bridge repository exposes optional status, diff, snapshot, diagnostics, and event-subscription capabilities through the shared `ProjectRepository` interface.

## Styling

Host apps must include the Arrowgram Web stylesheet. The React entrypoints do not currently auto-import CSS for you.

The package exports the built stylesheet at:

```text
node_modules/@hotdocx/arrowgram-web/dist/arrowgram-web.css
```

If your bundler can import that file directly, include it once in your app bootstrap:

```tsx
import "@hotdocx/arrowgram-web/dist/arrowgram-web.css";
import { ArrowgramWorkspaceApp } from "@hotdocx/arrowgram-web/embed";
```

Without this stylesheet, the editor will render, but it will look largely unstyled.

## Host environment notes

- `ArrowgramWorkspaceApp` expects browser APIs such as `crypto.randomUUID()`.
- Standard `http://localhost` development usually works.
- Plain-HTTP custom dev domains may not be treated as secure contexts by the browser, which can make `crypto.randomUUID()` unavailable.
- If you embed Arrowgram on a non-secure local host, prefer HTTPS or install a small fallback/polyfill for `crypto.randomUUID()`.

## Package Notes

- React peer dependency: `^18.2.0 || ^19.0.0`
- `ArrowgramWorkspaceApp` accepts `basePath` and `printPreviewPath` for hosts mounted under a subpath.
- The hosted OSS editor remains available at <https://hotdocx.github.io/arrowgram>.

## Repository

- OSS repo: <https://github.com/hotdocx/arrowgram>
- Architecture/spec docs: <https://github.com/hotdocx/arrowgram/tree/main/docs>
