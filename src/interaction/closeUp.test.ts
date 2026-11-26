import { describe, expect, it } from 'vitest'
import { createCloseUp } from './closeUp'

describe('close-up release', () => {
  const make = () => {
    const log: string[] = []
    const c = createCloseUp({ maxDistance: 1.2, onClose: (w) => log.push(w) })
    return { c, log }
  }
  it('releases when the task is done, on Esc and when the player moves away', () => {
    for (const [act, why] of [
      [(c: ReturnType<typeof make>['c']) => c.done(), 'done'],
      [(c: ReturnType<typeof make>['c']) => c.esc(), 'esc'],
      [(c: ReturnType<typeof make>['c']) => c.tick(1.5), 'away'],
    ] as const) {
      const { c, log } = make()
      expect(c.open()).toBe(true)
      c.tick(0.5)
      expect(c.isOpen()).toBe(true)
      act(c)
      expect(c.isOpen()).toBe(false)
      expect(log).toEqual([why])
      // E works again straight after.
      expect(c.open()).toBe(true)
    }
  })
  it('closes once and ignores calls while closed', () => {
    const { c, log } = make()
    c.esc()
    c.tick(9)
    c.open()
    c.done()
    c.done()
    expect(log).toEqual(['done'])
  })
})
