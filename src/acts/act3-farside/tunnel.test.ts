import { describe, expect, it } from 'vitest'
import { DOORWAY, Z_HATCH_END } from './layout'
import { buildRibs } from './tunnel'

describe('corridor props', () => {
  it('stands no rib in the doorway to the cabin', () => {
    const pos = buildRibs().attributes.position
    for (let i = 0; i < pos.count; i++) {
      const inDoorway = Math.abs(pos.getX(i)) < DOORWAY.halfW && Math.abs(pos.getZ(i) - Z_HATCH_END) < 0.4 && pos.getY(i) > 0.5
      expect(inDoorway, `vertex ${i}`).toBe(false)
    }
  })
})
