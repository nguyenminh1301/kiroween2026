# Requirements: playtest 4 fixes

1. Panel distance (acts 1 and 5)
   1.1 The centre of the main panel SHALL sit about 1.1 m from the eye, 0.1 to 0.3 m above it.
   1.2 The eye SHALL stay at the helmet height.
   1.3 From the couch, all four corners of the main panel SHALL be inside the view with a margin, with cabin around it.
   1.4 The DSKY SHALL stay within reach.
2. Re-entry sound
   2.1 WHILE the first act 5 outside shot plays, the system SHALL play a low rumble and an air roar whose level follows the glow curve.
   2.2 At the glow peak the system SHALL add a crackle of burning heat shield, and the sound SHALL fade as the capsule slows.
   2.3 In the cabin shot that follows, the same sound SHALL continue muffled, with rattles of loose items.
   2.4 The sound SHALL use the existing audio engine and recipes, with synthesized fallbacks.
3. Parachutes
   3.1 Suspension lines SHALL be thin lines, 16 to 24 per main and 10 to 12 per drogue, about one pixel wide, slightly see through.
   3.2 Each main confluence SHALL sit about 3 m above the capsule top, with a short riser to the capsule.
   3.3 Each drogue SHALL be a short, wide cone of bands with gaps, height about 0.6 of its width, open side toward the capsule.
   3.4 Each drogue SHALL have its lines, a confluence and a riser of about 15 m to the capsule.
   3.5 The order, the triangle, the sway and the release SHALL not change.
4. Subtitle layout
   4.1 The system SHALL lay out the full line first, centred under the speaker name, and reveal it in place, so the text does not move.
5. Cabin view (acts 1 and 5), replaces 1.1 and 1.3
   5.1 WHEN a cabin moment starts, looking straight ahead from the middle couch, the view SHALL show all seven panels of the main display console with cabin around them: hull and window frames above, side panels at the edges, gloves at the bottom.
   5.2 The crewmen on either side SHALL appear only at the edges, never in the middle third of the frame.
   5.3 The console, couches and crew SHALL keep close to the real sizes: console about 2.1 m long, couch centres about 0.7 m apart, a suited man about 1.8 m tall.
   5.4 The act 5 cabin SHALL start and stay looking forward at the panel and windows; no line turns the view to a crewman.
   5.5 The unit test SHALL project the whole console and the crew with the field of view, eye, pitch and yaw the game uses.
6. Late lines
   6.1 In act 4, "There goes the flag" SHALL start while the flag falls.
   6.2 In act 5, "Drogues." SHALL start when the drogues open.
   6.3 In act 4, Neil SHALL start down the ladder within 2 s of the last landing line.
