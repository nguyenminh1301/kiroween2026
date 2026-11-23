---
inclusion: always
---

# Repo rules

1. After each task, run `npm run test` and `npm run lint`, then commit only that task's files with a short conventional message (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
2. Never add a `Co-Authored-By` trailer or any AI model or vendor name to commits, code, comments or docs.
3. Never add `.kiro/` to `.gitignore`. Ignore `node_modules/`, `dist/`, `e2e/shots/` and `.env*`.
4. Do not modify, rename or re-encode files in `public/audio/`.
5. `window.__los` is the debug contract, set only when the URL has `?debug`. Never rename it.
6. Text under `src/content/` uses no em dash, en dash or ` -- `, plain short words, and passes `npm run check-copy`.
7. Do not modify files in `docs/reference/`.
8. Every third-party asset gets a row in `CREDITS.md`. Only CC0, public domain or OFL assets.
9. Crew names in the game are Neil Armstead, Mike Collier and Buzz Aldren. Never use the real astronauts' names in game text.
