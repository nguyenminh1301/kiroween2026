import { describe, expect, it } from 'vitest'
import {
  HANDLE_TURN,
  HATCH_OPEN,
  HATCH_SCENE_DURATION,
  handleAngle,
  hatchAngle,
  hatchEvents,
  hatchFade,
} from './hatchScene'

describe('hatch scene', () => {
  it('turns the handle first, then swings the hatch, then fades', () => {
    expect([handleAngle(0), handleAngle(5)]).toEqual([0, HANDLE_TURN])
    expect(hatchAngle(1)).toBe(0)
    expect(hatchAngle(5)).toBe(HATCH_OPEN)
    expect(hatchFade(3)).toBe(0)
    expect(hatchFade(5)).toBe(1)
    let last = -1
    for (let t = 0; t <= HATCH_SCENE_DURATION; t += 0.1) {
      expect(hatchAngle(t)).toBeGreaterThanOrEqual(last)
      last = hatchAngle(t)
    }
  })

  it('has the sounds in order and completes last', () => {
    const log: string[] = []
    const ev = hatchEvents({ playSound: (n) => log.push(n), say: (i) => log.push(i), complete: () => log.push('done') })
    ev.sort((a, b) => a.at - b.at).forEach((e) => e.run())
    expect(log).toEqual(['switch', 'hiss', 'creak', 'act0.board', 'done'])
  })
})
