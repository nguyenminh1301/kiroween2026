import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROT_HUNT, ROT_REST, glitchDelay, rotTarget, smearScale, stepRot } from './rot'

describe('rot', () => {
  it('has a target of 0 outside the dream, rest in the dream, 1 in a hunt', () => {
    expect(rotTarget({ dreaming: false, hunting: false })).toBe(0)
    expect(rotTarget({ dreaming: false, hunting: true })).toBe(0)
    expect(rotTarget({ dreaming: true, hunting: false })).toBe(ROT_REST)
    expect(rotTarget({ dreaming: true, hunting: true })).toBe(ROT_HUNT)
  })
  it('always moves toward the target, never past it, and stays in 0..1', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.constantFrom(0, ROT_REST, ROT_HUNT), fc.double({ min: 0, max: 0.05, noNaN: true }), (level, target, dt) => {
        const next = stepRot(level, target, dt)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThanOrEqual(1)
        expect(Math.abs(next - target)).toBeLessThanOrEqual(Math.abs(level - target))
        if (level <= target) expect(next).toBeLessThanOrEqual(target)
        else expect(next).toBeGreaterThanOrEqual(target)
      }),
    )
  })
  it('goes back to normal in a few seconds after the wake', () => {
    let l = ROT_HUNT
    let t = 0
    while (l > 0 && t < 30) {
      l = stepRot(l, 0, 0.05)
      t += 0.05
    }
    expect(t).toBeGreaterThan(2)
    expect(t).toBeLessThan(8)
  })
  it('rises faster in a hunt than in the dream, and falls slower than it rises', () => {
    expect(stepRot(0.45, ROT_HUNT, 0.1) - 0.45).toBeGreaterThan(stepRot(0, ROT_REST, 0.1))
    expect(1 - stepRot(1, ROT_REST, 0.1)).toBeLessThan(stepRot(0.45, ROT_HUNT, 0.1) - 0.45)
  })
  it('glitches more often at a high level', () => {
    expect(glitchDelay(1, 0.5)).toBeLessThan(glitchDelay(0.2, 0.5))
    expect(smearScale(1)).toBeGreaterThan(smearScale(0.5))
    expect(smearScale(0)).toBe(0)
  })
  it('keeps every decay rule behind html.rot', () => {
    const css = readFileSync(new URL('./rot.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.rot-layer \{\s*display: none;/)
    expect(css).not.toMatch(/^(h1|h2|img|\.bar)[^{]*\{/m)
  })
})
