---
title: emdash paper pipeline SOP (`print/`)
---

# Purpose

The `print/` workspace renders the research paper from a single Markdown source:

- Paper source: `print/public/index.md`
- Short/conference variant: `print/public/index_0.md`
- Renderer app: `print/src/App.tsx`
- Output: “Print / Save PDF” in the preview UI (Paged.js paginates the HTML)

The pipeline supports:

- KaTeX math: inline `$...$` and display `$$...$$`
- Mermaid diagrams: `<div class="mermaid">…</div>`
- Vega-Lite charts: `<div class="vega-lite">{…JSON…}</div>`
- Arrowgram commutative diagrams: `<div class="arrowgram">{…JSON…}</div>`

# Quickstart

From the repo root:

1. Install deps (once):
   - `npm install -w print`
2. Dev preview:
   - `npm run dev -w print`
   - open the shown URL and use the UI toggle for 1-column / 2-column
   - choose which paper to preview via query param:
     - default (archive/full): `/?paper=index.md` (or just `/`)
     - short (conference): `/?paper=index_0.md` (also accepts `?paper=0`)
3. “Print / Save PDF”:
   - use the UI button (top-right) which triggers the browser print dialog

# File map (what to touch for what)

Paper content

- `print/public/index.md`: the paper (YAML frontmatter + Markdown + embedded diagram blocks)
- `print/public/index_0.md`: shorter paper variant (same renderer/pipeline)

Renderer / parsing

- `print/src/App.tsx`: transforms `index.md` into HTML:
  - Pre-renders Mermaid to SVG and Arrowgram to SVG
  - Converts Markdown with Showdown
  - Renders KaTeX math to HTML
  - Feeds final HTML into Paged.js for pagination

Styling / layout

- `print/src/print-styles.css`: 2-column layout, column-spanning blocks (`.fullwidth`), diagram sizing, tables (`.emdash-table`), etc.

Arrowgram schema + validation

- `print/src/types.ts`: Zod schema for Arrowgram (used by validation tooling)
- `print/scripts/validate_paper.mjs`: parses all Arrowgram / Vega-Lite blocks from `print/public/index*.md` and validates JSON (Arrowgram via Zod)

Browser console / end-to-end checks

- `print/scripts/check_console.mjs`: Playwright-based smoke test:
  - starts `vite preview`
  - loads the app
  - fails on `console.error`, `pageerror`, request failures
  - treats KaTeX strict warnings (e.g. `[mathVsTextAccents]`) as failures
  - checks both `index.md` (default) and `index_0.md` (via `?paper=index_0.md`)

NPM scripts (most useful)

- `npm run validate:paper -w print`: validate embedded JSON blocks
- `npm run check:console -w print`: headless browser console check
- `npm run check:render -w print`: validate + build + console check (recommended before sending a PDF)

## Adding more variants

You can add additional public paper variants as `print/public/index_<N>.md` (e.g. `index_1.md`). The renderer can load any `*.md` via `?paper=...`, but the validation script currently auto-discovers and validates only files matching `index*.md`.

# Authoring conventions (important gotchas)

## KaTeX / math escaping

- Prefer normal KaTeX:
  - inline: `$f \\circ g$`
  - display:
    - `$$`
    - `\\mathrm{Hom}_{E(z)}(f_!w, x).`
    - `$$`
- Avoid Unicode combining accents or TeX accent macros that KaTeX treats as “text mode only” in math (these become console warnings and fail `check:console`).

## Arrowgram label formatting (common mistakes)

Arrowgram specs are JSON. That means **every backslash in LaTeX must be doubled for JSON**, and the label must be wrapped in `$...$`.

Typical examples that work well:

- Use explicit spaces with `\\ ` in LaTeX:
  - `"label": "$\\bullet \\ b_2$"`
  - `"label": "$0\\ \\bullet$"`
- Prefer `\\circ` etc.:
  - `"label": "$g \\circ f$"`
- Prefer `label_alignment: "left"` / `"right"` (often reads better than `"over"` in dense diagrams).

## Showdown + underscores + HTML tags inside math

Problem: Markdown parsers may interpret `_` in math as emphasis and inject HTML like `<em>`, breaking KaTeX.

Mitigation: `print/src/App.tsx` protects `$...$` and `$$...$$` blocks before running Showdown and restores them afterward.

If you see literal `<em>` tags inside formulas in the output, it usually means:
- the math delimiters are unbalanced, or
- the content accidentally left math mode (e.g. a missing `$`)

## Arrowgram JSON requirements

All Arrowgram diagrams must be valid JSON inside:

```html
<div class="arrowgram">
{ ... }
</div>
```

Rules:

- JSON strings must be valid JSON (escape backslashes).
- LaTeX labels inside Arrowgram JSON must be wrapped in math delimiters and double-escaped:
  - `"label": "$\\alpha$"`
  - `"label": "$f \\circ g$"`
- Arrow body styles are restricted; see `print/src/types.ts`.
- 2-cells can be drawn as “arrow-to-arrow” by using `name` on 1-arrows and referencing those names in the 2-arrow `from`/`to`.

Sizing tip:

- Arrowgram SVG scales to container width; to make a diagram appear larger in a column, reduce the coordinate span (smaller `left/top` maxima) so the computed `viewBox` is smaller.

## Mermaid diagrams in 2-column layout

If a Mermaid diagram is too wide, wrap it in:

```html
<div class="fullwidth">
  <div class="mermaid">
    ...
  </div>
</div>
```

This uses `.layout-two-column .fullwidth { column-span: all; }` in `print/src/print-styles.css`.

# Debugging playbook

## 1) JSON diagrams failing to render

Run:

- `npm run validate:paper -w print`

If Arrowgram JSON fails schema validation:
- check `style.body.name` is one of the allowed enums
- ensure `label` strings are valid JSON and LaTeX is double-escaped

## 2) “Diagram Error” boxes in the output

- Arrowgram errors: open browser console; the renderer logs parsing errors from `JSON.parse` and/or the Arrowgram runtime.
- Mermaid errors: usually Mermaid syntax; isolate by rendering in a minimal Mermaid live editor.

## 3) KaTeX warnings / math not rendering

Run:

- `npm run check:console -w print`

Typical causes:
- invalid math commands
- missing closing `$` / `$$`
- TeX accents used in math mode (KaTeX strict warns)

## 4) Something looks wrong only in the final PDF

Paged.js changes layout (page breaks, floats, columns). Use:

- toggle between 1-column and 2-column in the UI
- adjust CSS in `print/src/print-styles.css`
- prefer `break-inside: avoid` for figures/tables that should not split

# Local patches (what we changed and why)

These are “infrastructure” edits made while authoring the current paper; they explain why some parts of the pipeline behave the way they do.

## `print/src/App.tsx` (renderer hardening)

- **Math protection before Markdown**: `$...$` and `$$...$$` blocks are replaced by placeholder tokens before Showdown runs, then restored immediately after `makeHtml`. This prevents Showdown from turning `_` into `<em>` inside math.
- **Placeholder tokens avoid `_`**: placeholders use `AGPROT…AGPROT` tokens because underscores may be mutated by Markdown emphasis rules.
- **Code blocks protected from KaTeX pass**: `<pre>…</pre>` and `<code>…</code>` blocks are temporarily replaced so `$` inside code does not get interpreted as math.
- **“Double backslash” normalization**: KaTeX rendering trims a common authoring artifact where `\\omega` (etc.) accidentally appears in math; the renderer normalizes some of these back to `\omega` before calling KaTeX.

## `print/src/vite-env.d.ts` (TypeScript module typing)

- Adds a local module declaration for `pagedjs` (`Previewer.preview(...)`) so `print/src/App.tsx` typechecks without pulling in additional ambient types.

## `print/src/components/ArrowGramStatic.tsx` (Arrowgram SVG behavior)

- Uses `viewBox={diagram.viewBox}` with `className="w-full h-auto max-w-full"` so diagrams scale responsively to the column width.
- Keeps a small minimum size (`minWidth`, `minHeight`) to avoid “tiny” renders when diagrams are embedded in narrow contexts.

# Minimal checklist before sending a PDF

- `npm run check:render -w print`
- Open preview, toggle 2-column, scroll for:
  - missing diagrams
  - “Diagram Error” boxes
  - obvious KaTeX render failures
- Print to PDF from the preview UI
