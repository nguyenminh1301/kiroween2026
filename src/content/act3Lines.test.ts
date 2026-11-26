import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DREAM_CHOICES } from './menus'
import { LINES } from './subtitles'

const ACT3 = Object.keys(LINES).filter((id) => id.startsWith('act3.'))

describe('act 3 dialogue', () => {
  it('has exactly the agreed lines, speakers and moods', () => {
    const want: Record<string, [string, string | undefined, string]> = {
      'act3.los': ['LOS', undefined, 'Loss of signal.'],
      'act3.impostor': ['CAPCOM', undefined, 'Columbia, Houston. Say again, how many crew aboard?'],
      'act3.hold': ['CDR', 'whisper', 'Buzz. Hold your breath.'],
      'act3.heard': ['CDR', 'shout', 'It heard you. Hide!'],
      'act3.lost': ['CDR', 'whisper', "It's gone. Keep moving."],
      'act3.cage': ['CDR', 'whisper', 'Buzz. Up here. Get us down.'],
      'act3.carry.cdr': ['CDR', 'whisper', 'Easy. Every sound carries.'],
      'act3.carry.cmp': ['CMP', 'whisper', "Slow, Buzz. It's close."],
      'act3.down.cdr': ['CDR', 'whisper', 'Go back for Mike.'],
      'act3.down.cmp': ['CMP', 'whisper', "Neil's still down there. Go."],
      'act3.wake.cmp': ['CMP', undefined, 'Buzz! Hey, hey. You were shouting.'],
      'act3.wake.cdr': ['CDR', undefined, 'You okay over there?'],
      'act3.reply.dream': ['CMP', undefined, 'Happens up here. Drink some water and try again.'],
      'act3.reply.fine': ['CDR', undefined, 'Okay. Get some sleep, we land tomorrow.'],
    }
    expect(ACT3.sort()).toEqual(Object.keys(want).sort())
    for (const [id, [speaker, mood, text]] of Object.entries(want)) {
      expect(LINES[id].speaker, id).toBe(speaker)
      expect(LINES[id].mood, id).toBe(mood)
      expect(LINES[id].text, id).toBe(text)
    }
  })

  it('is subtitles only: no line is voiced and no recording exists, lines stay short and have no dashes', () => {
    const recorded = readdirSync('public/audio/vo')
    for (const id of ACT3) {
      expect(LINES[id].voiced, id).not.toBe(true)
      expect(recorded.some((f) => f.startsWith(id)), id).toBe(false)
      expect(LINES[id].text.length).toBeLessThanOrEqual(90)
      expect(LINES[id].text).not.toMatch(/[\u2013\u2014]| -- /)
    }
  })

  it('offers the two answers', () => {
    expect(DREAM_CHOICES.dream).toBe('Just a bad dream.')
    expect(DREAM_CHOICES.fine).toBe("I'm fine. Go back to sleep.")
  })
})
