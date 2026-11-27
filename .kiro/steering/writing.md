---
inclusion: fileMatch
fileMatchPattern: "src/content/**"
---

# Writing player-facing text

- No em dash, no en dash, no ` -- ` used as a dash.
- None of the banned words or phrases in `scripts/check-copy.mjs`. Run `npm run check-copy`.
- Subtitle lines are 90 characters or fewer.
- Radio sounds like 1969 flight loops: short, procedural, call sign first. "Roger", "Copy", numbers. Nobody explains their feelings.
- Every sentence tells the player something new.
- No "not X but Y" contrasts, no one-line dramatic closers, no lists of three for rhythm.
- Horror comes from wrong details stated plainly ("Cabin oxygen is running high"), not from adjectives.
- Anything presented as real (the Archive) cites a source. AGC source names are copied exactly.
- Crew names in the game: Neil Armstead, Mike Collier, Buzz Aldren, Gunter Went. The game never uses the real astronauts' names.
- The article page (`index.html`) is the one place for the real names: Neil Armstrong, Edwin "Buzz" Aldrin, Michael Collins. Every fact in it comes from the fact sheet or from a NASA or Smithsonian page listed in its Sources. `npm run check-copy` scans `index.html` with the same rules.
