# Arrowgram Web Viewer

A visual viewer for Arrowgram research papers + (LaTeX + Mermaid + Vega-Lite + Paged.js pipeline).

## Features
- PDF rendering
- Loads Markdown papers via `?paper=...`:
  - Relative: `?paper=index.md` (served from the app’s `BASE_URL`)
  - Absolute URL: `?paper=https://example.com/paper.md` (subject to that origin’s CORS)

## Development

```bash
npm install
npm run dev
```
