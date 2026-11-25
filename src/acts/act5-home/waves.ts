// The ocean surface height. Pure, so the scene and the capsule bob read the same sea.

/** Sea height at (x, z) metres, `t` seconds. Waves calm down far from the capsule. */
export function waveY(x: number, z: number, t: number): number {
  const fall = 1 / (1 + Math.hypot(x, z) / 900)
  return (
    (0.45 * Math.sin(0.09 * x + 0.05 * z + t * 0.9) +
      0.3 * Math.sin(0.06 * z - 0.11 * x + t * 1.3) +
      0.12 * Math.sin(0.31 * x + 0.27 * z + t * 2.1)) *
    fall
  )
}
