import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LINES } from './subtitles'

const IDS = Object.keys(LINES).filter((id) => id.startsWith('act4.') || id.startsWith('act5.'))
const WANT: Record<string, [string, string]> = {
  'act4.go': ['CAPCOM', "Eagle, Houston. If you read, you're go for powered descent."],
  'act4.alarm': ['CDR', "Program alarm. It's a 1202."],
  'act4.goalarm': ['CAPCOM', "Roger. We're go on that alarm."],
  'act4.sixty': ['CAPCOM', 'Sixty seconds.'],
  'act4.thirty': ['CAPCOM', 'Thirty seconds.'],
  'act4.contact': ['CDR', 'Contact light. Okay, engine stop.'],
  'act4.landed': ['CDR', 'Houston, Tranquility Base here. The Eagle has landed.'],
  'act4.landedok': ['CAPCOM', 'Roger, Tranquility. We copy you on the ground.'],
  'act4.down': ['CDR', 'Come on down, Buzz. The last step is a big one.'],
  'act4.flagtask': ['CDR', "Flag's on the ladder leg. Let's put it up by the marker."],
  'act4.flag': ['CDR', "That's up. Now stand next to it."],
  'act4.photo': ['CDR', 'Hold still. Got it.'],
  'act4.jobs': ['CDR', "I'll start on the samples. Scoop and seismometer are in the bay."],
  'act4.takescoop': ['CDR', 'Fill a bag from the fine stuff by the marker.'],
  'act4.sample': ['CDR', "That's a good one. Bag it."],
  'act4.takeseismo': ['CDR', 'Seismometer goes on that flat spot.'],
  'act4.seismo': ['CAPCOM', "Tranquility, the seismometer's already picking up your footsteps."],
  'act4.orbit': ['CMP', "Tranquility, Columbia. Coming over the hill. How's it look down there?"],
  'act4.back': ['CDR', "That's the list. Back up the ladder, Buzz."],
  'act4.far': ['CDR', "That's far enough. Stay close to the lander."],
  'act4.liftoff': ['CDR', 'Nine, eight, seven, six, five. Abort stage, engine arm, ascent, proceed.'],
  'act4.flagdown': ['CDR', 'There goes the flag.'],
  'act4.columbia': ['CMP', "Eagle, Columbia. I've got you in the sextant. Come on home."],
  'act5.entry': ['CDR', 'Entry interface. Here comes the air.'],
  'act5.blackout': ['CMP', "Radio's out. Three minutes and we'll hear them again."],
  'act5.radar': ['CAPCOM', 'Apollo 11, Houston. We have you on radar. Welcome back.'],
  'act5.drogues': ['CDR', 'Drogues are out.'],
  'act5.mains': ['CDR', 'Three good mains. Look at that ocean.'],
  'act5.splash': ['CMP', "Splashdown! We're down, Buzz. We're home."],
  'act5.hornet': ['HORNET', 'Apollo 11, Hornet. Swimmers are on the way. Sit tight.'],
  'act5.end': ['NARRATOR', 'July 24, 1969. Three men came home from the Moon.'],
}

describe('act 4 and 5 dialogue', () => {
  it('has exactly the agreed lines and no others', () => {
    expect(IDS.sort()).toEqual(Object.keys(WANT).sort())
    for (const [id, [speaker, text]] of Object.entries(WANT)) {
      expect(LINES[id].speaker, id).toBe(speaker)
      expect(LINES[id].text, id).toBe(text)
    }
  })

  it('is subtitles only, short, with no dashes and no recording left behind', () => {
    const recorded = readdirSync('public/audio/vo')
    for (const id of IDS) {
      expect(LINES[id].voiced, id).not.toBe(true)
      expect(recorded.some((f) => f.startsWith(id)), id).toBe(false)
      expect(LINES[id].text.length).toBeLessThanOrEqual(90)
      expect(LINES[id].text).not.toMatch(new RegExp('[\\u2013\\u2014]| -' + '- '))
    }
  })
})
