import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DREAM_CHOICES } from './menus'
import { LINES } from './subtitles'

const ACT3 = Object.keys(LINES).filter((id) => id.startsWith('act3.'))

describe('act 3 dialogue', () => {
  it('is subtitles only: no line is voiced and no recording exists, lines stay short and have no dashes', () => {
    const recorded = readdirSync('public/audio/vo')
    for (const id of ACT3) {
      expect(LINES[id].voiced, id).not.toBe(true)
      expect(recorded.some((f) => f.startsWith(id)), id).toBe(false)
    }
  })

  it('offers the two answers', () => {
    expect(DREAM_CHOICES.dream).toBe('Just a bad dream.')
    expect(DREAM_CHOICES.fine).toBe("I'm fine. Go back to sleep.")
  })
})
