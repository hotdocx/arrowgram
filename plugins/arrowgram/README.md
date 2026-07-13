# Arrowgram Codex Plugin

This repo-local Codex plugin packages Arrowgram authoring instructions and a small `arrowgram-agent` helper for local development.

The plugin is intentionally file-first. Codex edits `arrowgram.workspace.json`, `paper.md`, `paper.css`, and `diagram.json`, then validates, previews, reviews, snapshots, or builds through the portable `npx -y @hotdocx/arrowgram-agent` command. The repository-relative helper under `plugins/arrowgram/scripts/` is only for development inside this monorepo.

Install from the repo marketplace at `.agents/plugins/marketplace.json` while developing locally.
