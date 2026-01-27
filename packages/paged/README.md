# Arrowgram Web Viewer

A visual viewer for Arrowgram research papers + (LaTeX + Mermaid + Vega-Lite + Paged.js pipeline).

## Features
- PDF rendering
- Loads Markdown papers via `?paper=...`:
  - Relative: `?paper=index.md` (served from the app’s `BASE_URL`)
  - Relative (also accepted): `?paper=/index.md` (leading `/` is treated as relative to `BASE_URL`, useful on GitHub Pages subpaths)
  - Absolute URL: `?paper=https://example.com/paper.md` (subject to that origin’s CORS)
  - localStorage: `?paper=ls:some_key` (loads `localStorage.getItem("some_key")` on the current origin)

## Development

```bash
npm install
npm run dev
```
