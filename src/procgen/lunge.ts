// The swallow timeline for the act 3 creature. Pure: no Three.js or React imports.
// 0 to 0.3 s: the creature's face appears, lit, right in front of the camera. 0.3 to 0.7 s: it holds there (0.4 s).
// 0.7 to 1.2 s: the head splits open wide, teeth and throat in view (0.5 s). 1.2 to 1.5 s: the lunge. The upper
// and lower teeth close over the view from the top and bottom edges with a hard jolt and a red flash (0.3 s).
// 1.5 s: straight to black, no fade.
export const APPEAR_END = 0.3
export const HOLD_END = 0.7
export const OPEN_END = 1.2
export const BITE_END = 1.5
/** The scream and the jolt start with the lunge. */
export const JOLT_AT = OPEN_END
export const SLAM_END = BITE_END
export const LUNGE_TOTAL = BITE_END

export interface LungeFrame {
  /** 0 not there yet, 1 in front of the camera. */
  rise: number
  /** Same as rise: how far it has come toward the camera. */
  reach: number
  /** 0 closed, 1 wide open. Closed until the hold ends, opens to 1.2 s, stays open through the bite. */
  jaw: number
  /** 0 teeth away, 1 closed over the view. Only moves from 1.2 s to 1.5 s. */
  bite: number
  /** Red flash strength, 1 at the start of the lunge, easing off to the cut. */
  flash: number
  /** 0 clear view, 1 black. A hard cut at 1.5 s. */
  cover: number
  /** Camera jolt strength, 1 at the start of the lunge and gone by the black. */
  jolt: number
  /** Distance from the camera to the face centre, metres. */
  dist: number
  /** Scale of the head. */
  headScale: number
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const ease = (v: number): number => v * v * (3 - 2 * v)
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

export function lungeFrame(t: number): LungeFrame {
  const appear = ease(clamp01(t / APPEAR_END))
  const open = ease(clamp01((t - HOLD_END) / (OPEN_END - HOLD_END)))
  const u = clamp01((t - OPEN_END) / (BITE_END - OPEN_END))
  const lunging = t >= OPEN_END && t < BITE_END
  let dist = lerp(3, 1, appear)
  if (t >= HOLD_END) dist = lerp(1, 0.8, open)
  if (t >= OPEN_END) dist = lerp(0.8, 0.5, u)
  return {
    rise: appear,
    reach: appear,
    jaw: open,
    bite: t < OPEN_END ? 0 : u * u,
    flash: lunging ? 1 - 0.5 * u : 0,
    cover: t >= BITE_END ? 1 : 0,
    jolt: lunging ? 1 - u : 0,
    dist,
    headScale: lerp(1.8, 2.6, open) + (t >= OPEN_END ? 0.4 * u : 0),
  }
}
