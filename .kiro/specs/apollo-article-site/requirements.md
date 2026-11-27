# Requirements: apollo-article-site

The site opens on a long article about the flight of Apollo 11. The game is one button away.

## 1. Two pages
1.1 The build SHALL have two entry points: `index.html` (article) and `play.html` (game).
1.2 The article page SHALL NOT load Three.js, React, React Three Fiber or any game code.
1.3 The build SHALL keep `base: './'` so both pages work under a sub path.
1.4 The budget check SHALL measure each entry. The article page SHALL load under 300 KB of script and style, photos not counted.

## 2. Article page
2.1 The page SHALL look like a classic serious long read: off-white page, black serif text in one column about 680 px wide, serif fonts from Google Fonts, thin rules, small caps section labels, a drop cap on the first paragraph, small grey sans serif captions and credits, large italic pull quotes.
2.2 The page SHALL have no dark mode, gradients, animations, cards or rounded buttons, and SHALL NOT copy any real paper's name, logo, masthead or fonts.
2.3 A sticky top bar SHALL hold the masthead "LOSS OF SIGNAL", the line "The flight of Apollo 11, July 16 to 24, 1969", the section links and the button "Play as an astronaut". Under 720 px the links SHALL fold into a menu and the button SHALL stay.
2.4 The sections SHALL be, in order: headline and standfirst, The crew, Launch, Three days out, The landing, On the surface, Alone in orbit, Coming home, What really happened, Sources. Each section SHALL have two to five short paragraphs and one photo where it fits.
2.5 A closing block SHALL give one line about the game and a large "Play as an astronaut" button.
2.6 All ten photos SHALL be used, each with an own-words caption, the credit "NASA" linked to its source page, `loading="lazy"`, width and height.
2.7 Text SHALL follow `writing.md`. Real names appear only in the article. Every fact SHALL come from the fact sheet or a cited NASA or Smithsonian page.
2.8 The page SHALL use semantic HTML, a meta description and an Open Graph image (the crew portrait).

## 3. Game without a title menu
3.1 Both "Play as an astronaut" buttons SHALL open `play.html`.
3.2 WHEN `play.html` opens THE game SHALL show only the card "Use headphones. Click to begin." and one click SHALL start act 0.
3.3 The Esc menu SHALL hold Resume, Restart checkpoint, Chapters (same unlock rule), Settings (all current settings) and "Back to the article".
3.4 WHEN act 5 ends THE game SHALL fade out and open the article at "What really happened".
3.5 The title screen, its menu and the in game Archive screen SHALL be removed. `window.__los` SHALL keep working.

## 4. What really happened
4.1 The article SHALL list the eight real moments, each with what the player saw, the real fact and a source.
4.2 WHERE the browser has saved play data, each item SHALL show "Seen in your flight" or "Missed in your flight". Otherwise no marks.
4.3 The NASA photo AS11-40-5875 credit SHALL stay. The act 3 answer line SHALL go.

## 5. Final check
5.1 All checks SHALL pass, e2e scripts SHALL start from `play.html`, and a new e2e script SHALL cover the article page.
5.2 `product.md`, `README.md` and `docs/KIRO.md` SHALL be updated.
