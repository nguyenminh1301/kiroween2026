# Design: submission-docs

- Voice removal: delete `deliveryKind`'s `'voiced'` kind, `voicedSeconds`, `voicedIds`, `voKey`, the `voiced` field on `Line`, the `'voiced'` case in `radio.ts`, and the vo loading in `engine.ts`. `lineSeconds` loses its `fileSeconds` argument. Tests that expected the file now assert that no line is voiced.
- `docs/reference/` is deleted. Mentions elsewhere are rewritten or removed.
- Decision: audio rows in `CREDITS.md` keep the Freesound title and URL as `TODO` because the owner fills them in. The Freesound title column may hold the file's own name until known.
- Decision: the e2e chain list in `docs/KIRO.md` is read from `package.json` at write time.
