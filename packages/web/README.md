# `@hotdocx/arrowgram-web`

Embeddable Arrowgram workspace and paper-editor components for React apps.

This package is the reusable UI layer on top of `@hotdocx/arrowgram`. It exposes:

- `@hotdocx/arrowgram-web/embed` for the full workspace and paper editor
- `@hotdocx/arrowgram-web/adapters` for local and LastRevision-style repositories
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

`ArrowgramWorkspaceApp` uses local IndexedDB persistence by default. Pass custom repositories if your host app needs remote storage or attachment backends.

## Package Notes

- React peer dependency: `^18.2.0 || ^19.0.0`
- `ArrowgramWorkspaceApp` accepts `basePath` and `printPreviewPath` for hosts mounted under a subpath.
- The hosted OSS editor remains available at <https://hotdocx.github.io/arrowgram>.

## Repository

- OSS repo: <https://github.com/hotdocx/arrowgram>
- Architecture/spec docs: <https://github.com/hotdocx/arrowgram/tree/main/docs>
