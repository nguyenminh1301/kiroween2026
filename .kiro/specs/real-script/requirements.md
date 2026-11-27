# Requirements: real-script

The dialogue and narration move to the Apollo 11 air to ground record (NASA, public domain), and real NASA photos show during the game.

1. WHEN a line is spoken, THE game SHALL support the speakers `LMP` ("BUZZ ALDREN") and `SWIM` ("SWIM 1"), besides the existing ones.
2. THE script in `src/content/subtitles.ts` SHALL hold exactly the agreed lines, in order of play, with no line id the flows do not use.
   2.1. WHEN a line is longer than 90 characters, THE content SHALL split it into consecutive parts of 90 characters or fewer that play in order as one line.
   2.2. WHEN a beat has two or three lines, THE act SHALL play them in order, and a line that does not fit its beat MAY play over the next outside shot.
   2.3. `act0.intro1` SHALL keep its text and recording. All other lines are subtitles only.
   2.4. WHEN the player reaches the arm in act 0, THE game SHALL play `act0.count`.
3. THE chapter cards, the objective strips, the hints and the "In the game" text of the archive items SHALL match the new lines.
4. WHEN the story reaches a moment that has a real photo, THE game SHALL slide in a small print in the top right corner for about 8 seconds.
   4.1. THE print SHALL be about a fifth of the screen wide, tilted, with two caption lines (what and date, then "NASA photo" and the number).
   4.2. THE print SHALL NOT take the mouse or pause the game, SHALL be hidden in close-ups and in the act 3 chase, and SHALL be off when the setting "Photo prints" is off.
   4.3. THE game SHALL load each photo shortly before its moment and keep the first load under 5 MB.
   4.4. THE new photos SHALL be listed in the article Sources and in `CREDITS.md`.
   4.5. A unit test SHALL check that every photo in every act schedule exists in `photos.json` and on disk.
