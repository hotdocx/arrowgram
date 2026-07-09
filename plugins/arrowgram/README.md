# Arrowgram Codex Plugin

This repo-local Codex plugin packages Arrowgram authoring instructions and a small `arrowgram-agent` helper for local development.

The plugin is intentionally file-first. Codex edits `arrowgram.workspace.json`, `paper.md`, `paper.css`, and `diagram.json`, then validates or builds through `@hotdocx/arrowgram-agent`.

Install from the repo marketplace at `.agents/plugins/marketplace.json` while developing locally.
