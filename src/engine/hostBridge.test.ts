import { describe, expect, it } from 'vitest'
import { hostMessage, parseHostMessage } from './hostBridge'

describe('hostBridge', () => {
  it('round trips every message', () => {
    for (const m of [hostMessage.act('act3-farside'), hostMessage.act(null), hostMessage.hunt(true), hostMessage.hunt(false), hostMessage.leave(), hostMessage.end()]) {
      expect(parseHostMessage(JSON.parse(JSON.stringify(m)))).toEqual(m)
    }
  })
  it('rejects anything else', () => {
    for (const bad of [null, 'x', 3, {}, { type: 'end' }, { source: 'los', type: 'boom' }, { source: 'los', type: 'act', act: 'act9' }, { source: 'los', type: 'hunt', on: 'yes' }, { source: 'other', type: 'end' }]) {
      expect(parseHostMessage(bad)).toBeNull()
    }
  })
})
