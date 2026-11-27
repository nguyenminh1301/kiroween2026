# Design: real-script

- Long lines: `Line.more?: string[]` holds continuation parts (each at most 90 characters). The radio queue turns one `say(id)` into consecutive queue items (`id`, `id+1`, ...) and resolves when the last part ends. Urgent lines keep their parts.
- Act 1 is retimed after liftoff so the new radio traffic fits: tower, roll, max Q, staging, jettison and orbit move later and extra outside shots (all in the space set) keep the cabin at about 10 s. Lines have an explicit `seconds`.
- Act 0 "reaches the arm": the first time the player is 1.5 m along the arm (z below 3.5) while a beat is running. Assumption: the player starts on the arm, so this is the first steps.
- Prints: `src/content/prints.ts` holds per-act schedules (`photo`, `caption`, `date`, trigger id). `src/ui/prints.ts` is the pure show/hide state; `Prints` overlay in `Overlays.tsx`. Acts call `showPrint(id)` from a small engine helper. Hidden while the store says close-up or chase. A setting `prints` in settings turns them off.
- Photos are fetched with `new Image()` shortly before the moment (`preloadPrint`). They live in `public/img/article/`, outside the JS bundle budget.
- Quoted line text is exact. Where the record has two speakers in a row, each is its own id.
