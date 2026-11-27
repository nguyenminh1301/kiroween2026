# Requirements: game window

1. Game card and window
   1.1 The closing block of the article SHALL be the game card: a still of the act 0 pad, the title, the short text and the "Play as an astronaut" button.
   1.2 WHEN the player presses the card button or the top bar button, the page SHALL open a window over the article with a thin black frame and a narrow title bar. The bar SHALL show "LOSS OF SIGNAL" and the act name on the left, and "Full screen" and "Close" on the right.
   1.3 The window SHALL be at least 90% of the viewport width and height, never smaller than 960 by 540 for the game area on a desktop, with a 16:9 game area when there is room.
   1.4 WHILE the window is open, the article SHALL be dimmed, SHALL NOT scroll and SHALL NOT take focus.
   1.5 The window SHALL load `play.html` from the same origin in an iframe allowed to use full screen and autoplay. `play.html` SHALL keep working on its own.
   1.6 WHEN the player presses Close and a run is in progress, the page SHALL ask for confirmation before it closes the window. Esc SHALL stay the game's pause key and SHALL NOT close the window.
   1.7 WHERE the viewport is under 900 px wide or has no fine pointer, the button SHALL open `play.html` full screen and show a note that the game needs a keyboard and mouse.
   1.8 WHEN the run ends, the window SHALL close and the page SHALL scroll to `#what-really-happened` with its marks refreshed from the save.
2. Messages and the rotting page
   2.1 The game SHALL tell the page about act changes, the start and end of the act 3 hunt, leaving, and the end of the run, with typed `postMessage` messages. The page SHALL accept only messages from its own game frame and origin.
   2.2 WHILE act 3 is running, the article SHALL decay: stained red paper, cracked and smeared rules and headlines, darker photos, dark streaks from the top bar, small text glitches.
   2.3 WHILE the creature hunts, the decay SHALL grow. WHEN the hunt ends it SHALL ease off.
   2.4 WHEN act 3 ends, the page SHALL return to normal over a few seconds.
   2.5 The decay SHALL use CSS and small SVG or generated textures, no large images.
   2.6 WHERE the player prefers reduced motion, the decay SHALL keep the colour change and drop movement and flicker.
   2.7 The article opened alone SHALL NOT show the decay.
3. Write-up
   3.1 The game card text SHALL say the game opens in a window on this page.
   3.2 The Sources list SHALL name every photo the game shows.
4. Final check
   4.1 All checks SHALL pass and an e2e script SHALL cover the window, the decay and the end of a run.
   4.2 The product steering file, `README.md` and `docs/KIRO.md` SHALL describe this round.
