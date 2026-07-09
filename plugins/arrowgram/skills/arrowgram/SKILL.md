---
name: arrowgram
description: Create, edit, validate, preview, diff, snapshot, and build file-backed Arrowgram diagram or paper workspaces with @hotdocx/arrowgram-agent.
---

# Arrowgram

Use this skill when the user asks Codex to create, edit, fix, validate, preview, diff, snapshot, or build an Arrowgram diagram or paper workspace.

## Workspace Model

Arrowgram workspaces are file-backed. Treat source files as the editable artifact and generated output as disposable build output.

Common source files:

- `arrowgram.workspace.json`: workspace manifest.
- `paper.md`: Markdown paper or slide source.
- `paper.css`: paper styling.
- `diagram.json`: standalone diagram source.

Do not edit `dist/` as source. Rebuild it with `arrowgram-agent build`.

## Commands

Prefer the helper bundled with this plugin:

```bash
node plugins/arrowgram/scripts/arrowgram-agent.mjs <command> [args...]
```

The helper uses the local workspace `node_modules/.bin/arrowgram-agent` when available and otherwise falls back to:

```bash
npx -y @hotdocx/arrowgram-agent <command> [args...]
```

Core commands:

```bash
node plugins/arrowgram/scripts/arrowgram-agent.mjs init --type paper --root .
node plugins/arrowgram/scripts/arrowgram-agent.mjs init --type diagram --root .
node plugins/arrowgram/scripts/arrowgram-agent.mjs validate --root .
node plugins/arrowgram/scripts/arrowgram-agent.mjs dev --root . --host 127.0.0.1 --port 4173
node plugins/arrowgram/scripts/arrowgram-agent.mjs build --root . --out dist
```

## Workflow

1. Inspect the workspace before editing. Read `arrowgram.workspace.json` first when it exists.
2. If there is no workspace, initialize one with `init --type paper` unless the user explicitly asks for a standalone diagram.
3. Edit the whole underlying representation: Markdown, CSS, and JSON source files. Do not attempt to drive the editor UI through granular actions unless the user asks for browser testing.
4. Validate after source edits with `validate --root .`.
5. Build static output when the user needs publishable files.
6. If a dev server is useful, run `dev` and share the local URL. Do not leave a required server session running unintentionally at the end of the task.

## Diagram JSON Guidance

Follow the repository's authoritative schema in `docs/ARROWGRAM_SPEC.md` and `packages/arrowgram/arrowgram.schema.json`.

Use descriptive IDs for nodes and arrows. Use LaTeX labels where appropriate. Preserve existing layout intent unless the user asks for redesign.

## Paper Markdown Guidance

Papers use normal Markdown with optional YAML frontmatter. Embed diagrams as JSON inside:

```html
<div class="arrowgram">
{
  "nodes": [],
  "arrows": []
}
</div>
```

Reveal-style slides use a line containing only `---` outside code fences.

## Diff And Snapshot Semantics

`arrowgram-agent dev` exposes whole-artifact bridge endpoints under `/__arrowgram`.

- `GET /__arrowgram/status`: current workspace state.
- `GET /__arrowgram/diff`: source-file diff against the last saved git snapshot when a git baseline is available.
- `POST /__arrowgram/snapshot`: create a git snapshot for the manifest and referenced source files.

For normal Codex CLI work, use git diff/status directly when no bridge server is running. Do not invent a Codex-turn baseline.

## Safety

- Keep source edits scoped to the Arrowgram workspace unless the user requests repository changes.
- Do not commit secrets, API keys, generated `dist/`, or editor caches.
- Validate JSON with the Arrowgram CLI rather than relying on visual inspection alone.
- When fixing invalid JSON, preserve user-authored content and formatting where practical.
