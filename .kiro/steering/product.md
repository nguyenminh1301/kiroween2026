---
inclusion: always
---

# Product: LOSS OF SIGNAL

First-person, PS1-style horror game for desktop browsers, set on the Apollo 11 flight. Kiroween 2026 entry, Costume Contest category: the interface must feel haunted and polished, and every spooky element must serve how the game plays. A run takes about 12 minutes over six chapters. A chapter card (title and date over black) bridges each one.

## Cast
Player is Buzz Aldren, Lunar Module Pilot. Neil Armstead (commander, CDR). Mike Collier (command module pilot, CMP). Gunter Went leads the pad crew. Houston is CAPCOM. Faces never show: helmets on, or visors down in close shots.

## Acts
| Act id | Title | Beats |
|---|---|---|
| `act0-pad` | Pad 39A | Dawn on the swing arm. Narrator, two voiced lines. Wave at the crowd far below and they cheer. Walk to the White Room and board. Gunter remarks on four sets of boot prints. |
| `act1-launch` | Launch | Strapped in. Countdown, liftoff, cuts between cabin and Saturn V outside shots, staging. Cabin O2 reads high, as if four men were breathing. Flip the red switch, press the DSKY three times, TLI burn. Earth fills the window. |
| `act2-coast` | Coast | Zero gravity. Float to the lander by grabbing rails and pushing off. The engine arm breaker knob is snapped: find a pen, push the breaker in. Float back, the tunnel is longer. Get in the sleeping bag, hold C to close eyes: light flashes, someone else is breathing. |
| `act3-farside` | Far side | Buzz's dream, played as real until he wakes. He starts in his sleeping bag in the cabin, the other two bags empty. He walks (Earth gravity) down a long rust-red corridor lit by flashlight to find Neil and Mike. Something hunts by sound. Noise meter rises with movement, falls when you hold your breath (SPACE). Hide in lockers. A voice like Houston calls, though Houston cannot reach them. Neil and Mike are in a cage at the far end. Open it, carry one back to the bags (slower, louder), then go back in a silent corridor for the other. When Buzz takes him, the creature rises behind him and its head opens over the view. Buzz wakes in the real cabin, the crew turned toward him, and picks one of two answers. Checkpoints: `start`, `wp0`, `wp1`, `wp2`, `wp3`. Caught: restart from the last checkpoint, no gore. |
| `act4-moon` | Tranquility | Powered descent with the real 1202 alarm, plume, dust sheet, "contact light". Low gravity, jumping works. Three tasks in any order: flag, soil sample, seismometer. It picks up something big. The creature climbs out of a crater, run to the ladder. At liftoff the ascent engine burns the descent stage, routine name `BURN_BABY_BURN--MASTER_IGNITION_ROUTINE` on screen. Silent surface except radio (no air). Checkpoints: `start`, `tasks`, `run`. |
| `act5-home` | Splashdown | Re-entry, blackout, drogues and three main chutes, Pacific splashdown. USS Hornet, a destroyer, Sea King helicopter NAVY 66. Happy ending: a narrator line, then the Archive. |

## Archive
Shown after act 5. Lists every wrong detail the player could have noticed (O2 for four, longer tunnel, fourth sleeper, false Houston, burn routine), marked noticed or missed, each with the real Apollo fact and a source.

## Anti-goals
- A walk-through where nothing happens.
- Tiring controls: no interaction takes more than three clicks.
- More than two jump scares in the whole game.
- Invented facts presented as real.
- Disrespect to the real crew.

## Controls
Mouse look with pointer lock, WASD move, E use, SPACE hold breath (act 3) or jump (act 4), C close eyes (act 2), Q look back, F check wrist, Esc pause.
