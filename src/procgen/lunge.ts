// The swallow timeline for the act 3 creature. Pure: no Three.js or React imports.
// 0 to 0.25 s: the creature is suddenly in front of the camera. 0.25 to 0.6 s: the head splits open wide and
// the teeth fill the view. 0.6 s: a hard camera jolt and the scream. 0.6 to 0.8 s: the jaws slam shut.
// 0.8 s: straight to black, no fade. Under one second in all.
export const APPEAR_END = 0.25
export const OPEN_END = 0.6
export const JOLT_AT = OPEN_END
export const SLAM_END = 0.8
export const LUNGE_TOTAL = 0.85

export interface LungeFrame {
  /** 0 not there yet, 1 in front of the camera. */
  rise: number
  /** Same as rise: how far it has come toward the camera. */
  reach: number
  /** 0 closed, 1 wide open. Opens 0.25 to 0.6 s, slams shut 0.6 to 0.8 s. */
  jaw: number
  /** 0 clear view, 1 black. A hard cut at 0.8 s. */
  cover: number
  /** Camera jolt strength, 1 at the scream and gone by the black. */
  jolt: number
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const ease = (v: number): number => v * v * (3 - 2 * v)

export function lungeFrame(t: number): LungeFrame {
  const appear = clamp01(t / APPEAR_END)
  const open = ease(clamp01((t - APPEAR_END) / (OPEN_END - APPEAR_END)))
  const slam = clamp01((t - OPEN_END) / (SLAM_END - OPEN_END))
  return {
    rise: appear,
    reach: appear,
    jaw: t < OPEN_END ? open : 1 - slam * slam,
    cover: t >= SLAM_END ? 1 : 0,
    jolt: t >= JOLT_AT && t < SLAM_END ? 1 - (t - JOLT_AT) / (SLAM_END - JOLT_AT) : 0,
  }
}

/** Distance from the camera to the creature's head: 3 m when it appears, 0.5 m once it is in front. */
export const lungeDistance = (reach: number): number => 3 - 2.5 * reach
