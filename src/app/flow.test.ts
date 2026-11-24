import { describe, expect, it } from 'vitest'
import { cardDurationMs, gateReason, initialScreen, shouldShowCard, startAction, titleButtons } from './flow'

const ok = { pointerFine: true, width: 1280, webgl2: true }

describe('screen flow', () => {
  it('Start goes to act0-pad at its first checkpoint', () => {
    expect(startAction()).toEqual({ act: 'act0-pad', checkpoint: undefined })
  })

  it('shows Archive only after the finished flag', () => {
    expect(titleButtons(false).map((b) => b.id)).toEqual(['start', 'chapters', 'settings', 'credits'])
    expect(titleButtons(true).map((b) => b.id)).toEqual(['start', 'chapters', 'settings', 'archive', 'credits'])
  })

  it('shows the gate for a narrow window or a coarse pointer', () => {
    expect(gateReason(ok)).toBeNull()
    expect(gateReason({ ...ok, width: 899 })).toBe('gate')
    expect(gateReason({ ...ok, pointerFine: false })).toBe('gate')
    expect(gateReason({ ...ok, webgl2: false })).toBe('noWebgl')
    expect(initialScreen({ ...ok, width: 500 })).toBe('gate')
    expect(initialScreen(ok)).toBe('warning')
  })
})

describe('chapter card', () => {
  it('lasts max(4000, 1500 + 45 * characters) ms', () => {
    expect(cardDurationMs(['abc'])).toBe(4000)
    const long = ['x'.repeat(100), 'y'.repeat(100)]
    expect(cardDurationMs(long)).toBe(1500 + 45 * 200)
  })

  it('does not show when restarting from a later checkpoint, or on restart', () => {
    const intro = ['July 19, 1969.']
    expect(shouldShowCard({ intro, checkpoint: 'start', firstCheckpoint: 'start', restart: false })).toBe(true)
    expect(shouldShowCard({ intro, checkpoint: 'wp1', firstCheckpoint: 'start', restart: false })).toBe(false)
    expect(shouldShowCard({ intro, checkpoint: 'start', firstCheckpoint: 'start', restart: true })).toBe(false)
    expect(shouldShowCard({ intro: undefined, checkpoint: 'start', firstCheckpoint: 'start', restart: false })).toBe(false)
  })
})
