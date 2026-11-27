# Requirements: article redesign

The owner had a new design made for the article page: `docs/design/article-design.dc.html`.
It is a design file, not production code. The page stays plain static HTML and CSS and loads no game code.

## 1. Page and styles
1.1 The page SHALL have the same sections in the same order as the design, with the design's copy, type (Newsreader and Libre Franklin from Google Fonts), colours, rules, spacing, image sizes and crops.
1.2 The top bar SHALL stay at the top while the page scrolls.
1.3 Styles SHALL live in classes in `src/article/article.css`. The page SHALL have no inline styles and nothing that only exists for the design tool.

## 2. Behaviour
2.1 Both "Play as an astronaut" buttons and the footer link SHALL open `play.html`.
2.2 The section ids SHALL be those of the design. `#what-really-happened` SHALL equal `ARTICLE_END_HASH` in `src/app/flow.ts`.
2.3 The eight moments and their order SHALL match `MOMENT_IDS` in `src/content/archive.ts`.
2.4 WHEN this browser has a saved run, each moment SHALL show "Seen in your flight" (black label with a check) or "Missed in your flight" (outlined label) from the save, and the header line SHALL read "Your flight: N of 8 moments seen."
2.5 WHEN this browser has no saved run, the page SHALL show no marks and no header line.
2.6 Every photo SHALL keep the design's alt text and have width and height attributes. The hero photo SHALL load eagerly and the others SHALL use `loading="lazy"`.
2.7 WHILE the viewport is phone width, the columns SHALL stack, the section links SHALL scroll sideways in one line and the play button in the top bar SHALL stay visible.

## 3. Credits and checks
3.1 The fonts line in Sources, `CREDITS.md` and the budget check SHALL name the new fonts where they count fonts.
3.2 `e2e/article.mjs` SHALL check every section id, the ten photos, no console errors, the play link, marks after a saved run and none before, and SHALL save screenshots at 375, 768, 1280 and 1920 px as `e2e/shots/article-<width>.png`.
3.3 The article unit tests SHALL match the new markup.

## 4. Write-up
4.1 `README.md` and `docs/KIRO.md` SHALL have a short note on this round: one prompt, the article page built from a design file. Kiro CLI runs are called "Kiro CLI in non-interactive mode".
