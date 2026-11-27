// Re-entry shot maths: the glow curve, the attitude and the spark paths. No Three.js or React imports.

/** Angle of attack: the module flies about 20 degrees off its path, heat shield forward, because its centre of mass is offset. */
export const ATTACK = 0.35
/** Rotation about z that puts the heat shield (local -y) toward +x, the flight direction, tilted `ATTACK` down toward the Earth. */
export const FLIGHT_ROLL = Math.PI / 2 - ATTACK

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const smooth = (x: number): number => {
  const k = clamp01(x)
  return k * k * (3 - 2 * k)
}

/** Glow of the entry shot, 0 to 1: builds from 4 s, peaks at 8 to 9 s, then fades as the module slows. */
export function entryGlow(t: number): number {
  if (t < 4) return 0
  if (t < 8) return smooth((t - 4) / 4)
  if (t < 9) return 1
  if (t < 12) return 1 - 0.75 * smooth((t - 9) / 3)
  return 0.25 * (1 - smooth((t - 12) / 6))
}

/** Seconds a spark or flake lives. */
export const SPARK_LIFE = 2.6

/**
 * Position of one spark or flake of the burning shield at `time`. `seed` is four numbers in 0..1.
 * The flight direction is +x, so every particle starts near the shield rim and ends up behind, falling a little.
 */
export function particleAt(seed: readonly [number, number, number, number], time: number): { x: number; y: number; z: number; age: number } {
  const [r1, r2, r3, r4] = seed
  const age = (time / SPARK_LIFE + r1) % 1
  const a = r2 * Math.PI * 2
  const rad = 1.2 + r3 * 1.4
  const speed = 6 + r4 * 16
  const s = age * SPARK_LIFE
  return {
    x: 0.8 - speed * s,
    y: -0.3 + Math.sin(a) * rad * (1 + s * 0.6) - 0.35 * s * s,
    z: Math.cos(a) * rad * (1 + s * 0.6),
    age,
  }
}
