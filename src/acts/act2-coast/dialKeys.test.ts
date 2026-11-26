import { describe, expect, it } from 'vitest'
import { borrowMoveKeys } from './dialKeys'

const keys = (p: Partial<Record<'left' | 'right' | 'forward' | 'back', boolean>> = {}) => ({
  left: false,
  right: false,
  forward: false,
  back: false,
  ...p,
})

describe('borrowMoveKeys', () => {
  it('reads D as +1 and A as -1, and hides all movement keys from the player step', () => {
    const held = keys({ right: true, forward: true })
    const b = borrowMoveKeys(held)
    expect(b.dir).toBe(1)
    expect(held).toEqual(keys())
    expect(borrowMoveKeys(keys({ left: true })).dir).toBe(-1)
    expect(borrowMoveKeys(keys({ left: true, right: true })).dir).toBe(0)
  })

  it('a held D keeps turning the dial on the next frame after restore', () => {
    const held = keys({ right: true })
    const frame1 = borrowMoveKeys(held)
    frame1.restore()
    const frame2 = borrowMoveKeys(held)
    expect(frame1.dir).toBe(1)
    expect(frame2.dir).toBe(1)
    frame2.restore()
    expect(held).toEqual(keys({ right: true }))
  })
})
