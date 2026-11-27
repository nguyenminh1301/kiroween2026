# Design: article redesign

- `index.html` is written by hand as static HTML from the design. Repeated blocks (numbers, timeline, moments, sources) are written out, not scripted.
- Image paths are relative (`img/...`), as before, because `vite.config.ts` uses base `./`. The design uses leading slashes.
- `src/article/article.css` holds all styles. Class names: `bar`, `sections`, `play`, `prose`, `kicker`, `title`, `fig`, `cap`, `numbers`, `timeline`, `pullquote`, `photo-row`, `orbit`, `moments`, `mark`, `game`, `sources`, `site-footer`.
- Marks: each moment `<li data-moment="id">` has one hidden `<span class="mark">`. `applyMarks` in `src/article/marks.ts` fills it (text, `data-state`, check icon for seen) from the saved run, then unhides it and the header line `#marks-note`, and writes the count into `#marks-count`. Game e2e scripts read `.moment .mark`, so that selector stays.
- `momentMarks` and `MARK_TEXT` are unchanged. The design's fixed seen list is only a mockup.
- The old folding menu is removed. The section links are one scrolling row at every width. `main.ts` only calls `applyMarks`.
- Decisions: at 640 px and below the date line and the tagline in the top bar are hidden so the sticky bar stays short. Links inside the dark band hover to a light red, since dark red on near black is unreadable.
- Fonts come from Google Fonts, so no font files are in the repo and the budget check (script and style only) needs no change.
