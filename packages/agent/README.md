# `@hotdocx/arrowgram-agent`

File-backed Arrowgram workspace bridge for coding-agent workflows.

## CLI

```bash
arrowgram-agent init --type paper
arrowgram-agent dev --root . --host 0.0.0.0 --port 4173
arrowgram-agent validate --root .
arrowgram-agent build --root . --out dist
```

The bridge treats `arrowgram.workspace.json` plus its referenced source files as
the editable state. Diffs compare the current source files against the last git
snapshot where a git baseline is available.

## Workspace Files

The default paper workspace contains:

```text
arrowgram.workspace.json
paper.md
paper.css
```

The default diagram workspace contains:

```text
arrowgram.workspace.json
diagram.json
```

Source files are intentionally ordinary files. An AI coding agent can edit
`paper.md`, `paper.css`, or `diagram.json` directly; the browser editor receives
file-change events and reloads the affected project.

## Bridge API

`arrowgram-agent dev` serves the editor and these whole-artifact endpoints under
`/__arrowgram`:

```text
GET  /healthz
GET  /projects
POST /projects
GET  /projects/:id
PUT  /projects/:id
DELETE /projects/:id
GET  /status
GET  /diff
POST /snapshot
GET  /diagnostics
GET  /events
```

`/diff` reports current source files versus the latest git snapshot. `/snapshot`
creates a git commit for the manifest and referenced source files. `/events` is
an SSE stream used by `@hotdocx/arrowgram-web` to keep the editor synchronized.

## Static Output

`arrowgram-agent build` writes a read-only `index.html` with Markdown converted
to HTML and embedded Arrowgram diagrams rendered as SVG. The editable bridge API
is not included in the published output.
