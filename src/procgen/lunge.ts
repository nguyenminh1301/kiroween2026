// The lunge timeline for the act 3 creature. Pure: no Three.js or React imports.
// Rise 0 to 0.6 s, lunge and jaw open 0.6 to 1.1 s, closed over the view 1.1 to 1.2 s.
export const LUNGE_TOTAL = 1.2
export const RISE_END = 0.6
export const LUNGE_END = 1.1

export interface LungeFrame {
  /** 0 crouched behind the crewman, 1 standing. */
  rise: number
  /** 0 at its spot, 1 at the camera. */
  reach: number
  /** 0 closed, 1 wide open. */
  jaw: number
  /** 0 clear view, 1 the mouth has closed over it. */
  cover: number
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const ease = (v: number): number => v * v * (3 - 2 * v)

export function lungeFrame(t: number): LungeFrame {
  const rise = ease(clamp01(t / RISE_END))
  const lunge = clamp01((t - RISE_END) / (LUNGE_END - RISE_END))
  return {
    rise,
    reach: lunge * lunge,
    jaw: ease(clamp01((t - RISE_END * 0.8) / (LUNGE_END - RISE_END * 0.8))),
    cover: clamp01((t - LUNGE_END) / (LUNGE_TOTAL - LUNGE_END)),
  }
}

/** Distance from the camera to the creature's head: 2.4 m at the start of the lunge, 0.15 m at its end. */
export const lungeDistance = (reach: number): number => 2.4 - 2.25 * reach
