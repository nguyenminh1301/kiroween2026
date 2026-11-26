# Requirements: playtest fixes, acts 0 to 2

Source: the player's notes on acts 0, 1 and 2 and the shared UI. Terms: "interactable" is anything with a yellow frame and a verb.

1. Camera. THE game SHALL NOT turn the player's view onto an interactable or a speaker in acts 0, 1 or 2. Act 1 cutaways to outside shots stay.
2. Act 0 talk. WHEN the player looks at a pad crew member and presses E, THE crew member SHALL speak (verb TALK). Walking past SHALL NOT start a line or stop the player. Boarding SHALL NOT need a talk. Gunter's boot print line SHALL mark `extra-bootprints` as noticed. The narrator lines SHALL still start on their own.
3. Act 0 rocket. THE stack top SHALL be: command module cone (3.9 m base, 3.2 m tall) under the white boost cover, behind the White Room; a lattice escape tower (3 m tall, 1.2 m wide at the base, thin bars); a white motor (0.7 m wide, 4.5 m long); a short black and white nose with canards and a pointed tip. Escape system about 10 m tall.
4. Launch shake. THE view shake SHALL be at most 0.4 degrees of rotation and 1 cm of offset, smooth noise at 8 to 14 Hz, strongest for 10 s after liftoff, then fading, with a short bump at staging. IF the settings shake value exists, THE shake SHALL scale with it. IF reduced motion is on, THE shake SHALL be zero.
5. Launch plume. THE flame SHALL be five cone plumes (white yellow core, orange edge), merged to about 10 m wide below the bells, additive and flickering, with a glow sprite, never a single flat quad. Near the pad most flame SHALL go into the trench and drive the side steam clouds. Higher up the plume SHALL lengthen to about the first stage length at the same width.
6. Windows. THE command module SHALL have five windows (left, right, two rendezvous, hatch) showing one shared outside world by direction. During the TLI and Earth beats THE Earth SHALL show only in the right window. Each view SHALL fill its opening exactly (stencil). Act 2 windows follow the same rule if they paint views.
7. Act 2 repairs. THE act SHALL have three repairs in any order: oxygen line (take hammer, three taps), cabin pressure (gauge, A/D or wheel, hold the needle in the green band 1 s), computer (three buttons, then green OK). One in the command module, one at the tunnel, one in the lander. Each has an objective, a Houston line when done and a framed interactable. The pen and breaker go. `tunnel-longer` stays.
8. Bedtime. THE act SHALL NOT flash lights or sting. Holding C SHALL fade to black in 2 s, drop the hum and play slow breathing with four rhythms. Eyes closed 6 s or more SHALL mark `fourth-sleeper`. Loss of signal plays as the act ends. The Archive text SHALL match.
9. Narrow windows. Subtitles, the objective paper and the chapter card SHALL wrap within 90% of the window width, at most three lines, with the font scaling down on narrow windows.

New lines are subtitles only (no recorded voice). Text follows the writing steering file.
