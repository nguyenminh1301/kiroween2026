import { beforeEach, describe, expect, it } from 'vitest'
import { fxStore } from './fx'
import { frameDriver } from './frameDriver'
import { gameStore } from './store'
import { cleanupRegistry } from './cleanupRegistry'
import { nextPrintId, printHidden, PRINT_SECONDS, PRINT_SLIDE_OUT, showPrint } from './prints'

const calm = { gauge: false, photo: false, bite: false, card: false, choice: false, tension: 'CALM' }

describe('print rules', () => {
  it('hides in close-ups, the photo print, the swallow, cards, the answer and the act 3 chase', () => {
    expect(printHidden(calm)).toBe(false)
    for (const k of ['gauge', 'photo', 'bite', 'card', 'choice'] as const) expect(printHidden({ ...calm, [k]: true }), k).toBe(true)
    expect(printHidden({ ...calm, tension: 'CHASE' })).toBe(true)
    expect(printHidden({ ...calm, tension: 'STALK' })).toBe(false)
  })

  it('knows the next photo of an act so it can load it ahead', () => {
    expect(nextPrintId('act1-launch', 'liftoff')).toBe('earth')
    expect(nextPrintId('act1-launch', 'earth')).toBeNull()
    expect(nextPrintId('act5-home', 'lifted')).toBe('quarantineWalk')
    expect(nextPrintId('act0-pad', 'x')).toBeNull()
  })
})

describe('showPrint', () => {
  beforeEach(() => {
    cleanupRegistry.runAll()
    fxStore.getState().setPrint(null)
    gameStore.getState().setPaused(false)
    gameStore.getState().setSettings({ prints: true })
  })
  const run = (seconds: number): void => {
    for (let t = 0; t < seconds - 1e-9; t += 0.05) frameDriver.step(0.05)
  }

  it('slides in, stays 8 s of game time, slides out and goes', () => {
    showPrint('act1-launch', 'liftoff')
    const p = fxStore.getState().print
    expect(p?.line1).toBe('Apollo 11 lifts off, July 16, 1969')
    expect(p?.line2).toBe('NASA photo S69-39961')
    expect(p?.leaving).toBe(false)
    run(PRINT_SECONDS - 0.5)
    expect(fxStore.getState().print?.leaving).toBe(false)
    run(0.7)
    expect(fxStore.getState().print?.leaving).toBe(true)
    run(PRINT_SLIDE_OUT + 0.2)
    expect(fxStore.getState().print).toBeNull()
  })

  it('does not count paused time', () => {
    showPrint('act1-launch', 'liftoff')
    gameStore.getState().setPaused(true)
    run(30)
    expect(fxStore.getState().print?.leaving).toBe(false)
    gameStore.getState().setPaused(false)
    run(PRINT_SECONDS + 0.2)
    expect(fxStore.getState().print?.leaving).toBe(true)
  })

  it('shows nothing when the setting is off, and a newer print replaces an older one', () => {
    gameStore.getState().setSettings({ prints: false })
    showPrint('act1-launch', 'liftoff')
    expect(fxStore.getState().print).toBeNull()
    gameStore.getState().setSettings({ prints: true })
    showPrint('act1-launch', 'liftoff')
    const first = fxStore.getState().print?.key
    showPrint('act1-launch', 'earth')
    expect(fxStore.getState().print?.key).not.toBe(first)
    run(PRINT_SECONDS + 0.2)
    expect(fxStore.getState().print?.leaving).toBe(true)
  })
})

describe('print slide out class', () => {
  it('does not reuse the class of the screen fade, which covers the whole view', async () => {
    const { readFileSync } = await import('node:fs')
    const tsx = readFileSync('src/ui/Overlays.tsx', 'utf8')
    expect(tsx).not.toMatch(/\? 'leaving'/)
    const css = readFileSync('src/ui/ui.css', 'utf8')
    expect(css).toMatch(/\.print\.print-leaving\s*\{/)
    expect(css).not.toMatch(/\.print\.leaving/)
  })
})
