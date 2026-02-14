# Arrowgram Web Workspace (`@arrowgram/web`)

The client-side Arrowgram workspace UI (React + Vite).

**Try it now at: [https://hotdocx.github.io/arrowgram](https://hotdocx.github.io/arrowgram)**

**And its LastRevision version: [https://hotdocx.github.io](https://hotdocx.github.io)**


It supports:

- **Diagrams**: visual commutative diagram editor (Arrowgram JSON).
- **Papers / Documents**: Markdown editor with a live renderer pipeline:
  - Arrowgram blocks (`<div class="arrowgram">…</div>`)
  - KaTeX math (`$...$`, `$$...$$`)
  - Mermaid (`<div class="mermaid">…</div>`)
  - Vega-Lite (`<div class="vega-lite">{...}</div>`)

### Paper templates (master processors)

Papers can be rendered using a per-document “master template”:

- `paged` (Paged.js): paginated article/book preview + “Print / Save PDF”.
- `reveal` (Reveal.js): slide deck preview (slides separated by a line containing `---`).

Each paper also has a **CSS side-artifact** (`customCss`) applied on top of template defaults.

When publishing a paper to gallery, the snapshot thumbnail is template-aware:

- `paged`: captures the **first rendered page** only.
- `reveal`: captures the **first slide** only.

### Creating new papers

From the workspace dashboard, you can create:

- **New Paged Paper** (starts in `paged`)
- **New Slides** (starts in `reveal`)

## URL Import
 
You can preload content via query params:
 
- Diagram inline: `/?spec=<base64url(utf8-json)>`
- Paper inline: `/?paper=<base64url(utf8-markdown)>`
- Fetch by URL (CORS-dependent): `/?link=<https://... or /path>&type=diagram|paper`
- Load from localStorage: `/?link=ls:my_key&type=paper`

## Development

```bash
npm install
npm run dev
```
