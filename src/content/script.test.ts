import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LINES, SPEAKER_NAMES } from './subtitles'

/** The script as agreed: speaker, mood and the full text (parts joined by a space). */
const WANT: Record<string, [string, string | null, string]> = {
  "act0.intro1": ["NARRATOR", null, "July 16, 1969. A million people came to the Cape to watch three men leave the Earth."],
  "act0.intro2": ["NARRATOR", null, "You're Buzz Aldren, lunar module pilot. You board last. Neil and Mike are already strapped in."],
  "act0.count": ["LAUNCH", null, "This is Apollo Saturn Launch Control. All elements of the Apollo 11 countdown are go at this time."],
  "act0.tech1": ["TECH", null, "Morning, Buzz. Clear sky, light wind off the ocean. Good day for it."],
  "act0.tech2": ["TECH", null, "Take a look at the beach road. They've been parked out there all night."],
  "act0.wave": ["TECH", null, "They can't hear you from here, but they saw that."],
  "act0.gunter1": ["PAD", null, "Morning, Buzz. Middle couch. Mind your head on the hatch rim."],
  "act0.gunter2": ["PAD", null, "Have a good trip. See you in eight days."],
  "act0.board": ["CDR", null, "Morning, Buzz. Get comfortable. We've got two and a half hours to lie here."],
  "act1.count": ["LAUNCH", null, "T minus 15 seconds, guidance is internal. 12, 11, 10, 9, ignition sequence start."],
  "act1.count2": ["LAUNCH", null, "6, 5, 4, 3, 2, 1, zero. All engines running."],
  "act1.liftoff": ["LAUNCH", null, "Liftoff. We have a liftoff, 32 minutes past the hour. Liftoff on Apollo 11."],
  "act1.tower": ["LAUNCH", null, "Tower cleared."],
  "act1.roll": ["CDR", null, "Roger. We got a roll program."],
  "act1.rollok": ["CAPCOM", null, "Roger. Roll."],
  "act1.maxq": ["LAUNCH", null, "We're through the region of maximum dynamic pressure now."],
  "act1.staginggo": ["CAPCOM", null, "Apollo 11, this is Houston. You are go for staging."],
  "act1.staging": ["CDR", null, "Staging. And ignition."],
  "act1.jettison": ["CMP", null, "There goes the tower. We've got windows."],
  "act1.shutdown": ["CDR", null, "Shutdown."],
  "act1.orbit": ["CAPCOM", null, "Roger. Shutdown. We copy 101.4 by 103.6."],
  "act1.key": ["CDR", null, "Buzz, load the burn numbers. They're on the card."],
  "act1.tli": ["CAPCOM", null, "Apollo 11, this is Houston. You are go for TLI. Over."],
  "act1.tliack": ["CMP", null, "Apollo 11. Thank you."],
  "act1.tliburn": ["CDR", null, "Ignition."],
  "act1.tligo": ["CAPCOM", null, "We confirm ignition, and the thrust is go."],
  "act1.flashes": ["CMP", null, "Flashes out window number 5. Could be the engine."],
  "act1.ride": ["CDR", null, "Hey, Houston, Apollo 11. That Saturn gave us a magnificent ride."],
  "act1.rideok": ["CAPCOM", null, "Roger, 11. We'll pass that on. It certainly looks like you are well on your way now."],
  "act1.earth": ["CMP", null, "Look out the left window, Buzz. You can see all of Africa."],
  "act1.rest": ["CAPCOM", null, "Apollo 11, Houston. Everything looks good down here. Get some rest."],
  "act2.jobs": ["CAPCOM", null, "Hello, Apollo 11. Houston. We've got a few items for you before your rest period."],
  "act2.out": ["CDR", null, "The list's on the wall, Buzz. Two up here and one down in Eagle."],
  "act2.o2": ["CAPCOM", null, "Apollo 11, Houston. We've been noting some funnies on the O2 flow indicator."],
  "act2.o2b": ["CMP", null, "That line rattles every time. Give the joint a couple of taps."],
  "act2.o2done": ["CAPCOM", null, "Roger. O2 flow looks normal now."],
  "act2.press": ["CMP", null, "Cabin pressure's reading low. Bring it back up to five."],
  "act2.pressdone": ["CAPCOM", null, "Roger. We see five point zero."],
  "act2.comp": ["CMP", null, "Eagle's computer is throwing lights. Clear them one at a time."],
  "act2.compdone": ["CAPCOM", null, "Roger. Eagle's computer looks clean from here."],
  "act2.longer": ["CMP", null, "You were down there a while. How's Eagle?"],
  "act2.sleep": ["CAPCOM", null, "Hello, Apollo 11. Houston. As the Sun sinks slowly in the west, the White Team bids you good night."],
  "act2.sleepack": ["CDR", null, "Good night, Houston. Lights out, Buzz."],
  "act3.around": ["CAPCOM", null, "Apollo 11, this is Houston. All your systems are looking good going around the corner, and we'll see you on the other side."],
  "act3.aroundack": ["CDR", null, "Roger. Everything looks okay up here."],
  "act3.los": ["LOS", null, "Loss of signal."],
  "act3.impostor": ["CAPCOM", null, "Columbia, Houston. Say again, how many aboard?"],
  "act3.hold": ["CDR", "whisper", "Buzz. Don't breathe."],
  "act3.heard": ["CDR", "shout", "It heard you. Hide!"],
  "act3.lost": ["CDR", "whisper", "It's gone. Go."],
  "act3.cage": ["CDR", "whisper", "Buzz. Up here. Get us down."],
  "act3.carry.cdr": ["CDR", "whisper", "Easy. It can hear everything."],
  "act3.carry.cmp": ["CMP", "whisper", "Slow, Buzz. It's close."],
  "act3.down.cdr": ["CDR", "whisper", "Go back for Mike."],
  "act3.down.cmp": ["CMP", "whisper", "Neil's still down there."],
  "act3.wake.cmp": ["CMP", null, "Buzz. Hey. Buzz. You were shouting."],
  "act3.wake.cdr": ["CDR", null, "You all right over there?"],
  "act3.reply.dream": ["CMP", null, "Happens up here. Have some water."],
  "act3.reply.fine": ["CDR", null, "Okay. Get some sleep. We land tomorrow."],
  "act4.go": ["CMP", null, "Eagle, this is Columbia. They just gave you a go for powered descent."],
  "act4.alarm": ["CDR", null, "Program alarm. It's a 1202."],
  "act4.alarmask": ["CDR", null, "Give us a reading on the 1202 program alarm."],
  "act4.goalarm": ["CAPCOM", null, "Roger. We're go on that alarm."],
  "act4.landing": ["CAPCOM", null, "Eagle, Houston. You're go for landing."],
  "act4.dust": ["LMP", null, "40 feet, down two and a half. Picking up some dust."],
  "act4.sixty": ["CAPCOM", null, "60 seconds."],
  "act4.thirty": ["CAPCOM", null, "30 seconds."],
  "act4.contact": ["LMP", null, "Contact light."],
  "act4.stop": ["CDR", null, "Shutdown."],
  "act4.stopack": ["LMP", null, "Okay. Engine stop."],
  "act4.landed": ["CDR", null, "Houston, Tranquility Base here. The Eagle has landed."],
  "act4.landedok": ["CAPCOM", null, "Roger, Tranquility. We copy you on the ground. You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot."],
  "act4.foot": ["CDR", null, "I'm at the foot of the ladder. I'm going to step off the LM now."],
  "act4.step": ["CDR", null, "That's one small step for man, one giant leap for mankind."],
  "act4.down": ["CDR", null, "Okay, Buzz. Come on down. It takes a pretty good little jump at the bottom."],
  "act4.view": ["LMP", null, "Beautiful view!"],
  "act4.viewcdr": ["CDR", null, "Isn't that something! Magnificent sight out here."],
  "act4.desolation": ["LMP", null, "Magnificent desolation."],
  "act4.flagtask": ["CDR", null, "Flag's on the ladder leg. Let's put it up by the marker."],
  "act4.flagup": ["CAPCOM", null, "Columbia, they've got the flag up now, and you can see the stars and stripes on the lunar surface."],
  "act4.flagcmp": ["CMP", null, "Beautiful. Just beautiful."],
  "act4.photo": ["CDR", null, "Stand by the flag, Buzz. Hold still."],
  "act4.photodone": ["CDR", null, "Got it."],
  "act4.jobs": ["CDR", null, "I'll get the samples started. Scoop and seismometer are in the bay."],
  "act4.takescoop": ["CDR", null, "Fill a bag from the fine stuff by the marker."],
  "act4.sample": ["CDR", null, "It's a very soft surface, but here and there you hit something hard. Bag it."],
  "act4.takeseismo": ["CDR", null, "Seismometer goes on that flat spot."],
  "act4.seismo": ["CAPCOM", null, "Tranquility Base, Houston. The passive seismic experiment has been uncaged and we're observing short period oscillations."],
  "act4.orbit": ["CMP", null, "Houston, Columbia on the high gain. How's it going?"],
  "act4.orbitok": ["CAPCOM", null, "The EVA is progressing beautifully."],
  "act4.back": ["CAPCOM", null, "Head on up the ladder, Buzz."],
  "act4.adios": ["LMP", null, "Okay. Adios, amigos."],
  "act4.far": ["CDR", null, "That's far enough. Stay close to the lander."],
  "act4.liftoff": ["LMP", null, "9, 8, 7, 6, 5. Abort stage, engine arm, ascent, proceed."],
  "act4.off": ["CDR", null, "We're off. Look at that stuff go all over the place."],
  "act4.quiet": ["LMP", null, "Beautiful. Very quiet ride."],
  "act4.flagdown": ["LMP", null, "There goes the flag."],
  "act4.columbia": ["CMP", null, "Eagle, Columbia. I've got you in the sextant. Come on home."],
  "act5.cleared": ["CAPCOM", null, "Apollo 11, Houston. You're still looking mighty fine from here. You're cleared for landing."],
  "act5.gear": ["LMP", null, "Roger. Gears down and locked."],
  "act5.hill": ["CAPCOM", null, "You're going over the hill there shortly. You're looking mighty fine to us."],
  "act5.later": ["CDR", null, "See you later."],
  "act5.blackout": ["CMP", null, "There goes the radio."],
  "act5.aria": ["CAPCOM", null, "Apollo 11, Houston through ARIA. Standing by. Over."],
  "act5.airboss": ["CAPCOM", null, "Apollo 11, Houston. Air Boss has visual contact."],
  "act5.drogues": ["CDR", null, "Drogues."],
  "act5.mains": ["CDR", null, "Three good mains."],
  "act5.hornet": ["HORNET", null, "Apollo 11, Apollo 11. This is Hornet. Over."],
  "act5.hornetack": ["CDR", null, "Hello, Hornet. This is Apollo 11, reading you loud and clear."],
  "act5.alt": ["CDR", null, "Apollo 11 at 1500 feet."],
  "act5.swim": ["SWIM", null, "Roger. You're looking real good."],
  "act5.splash": ["SWIM", null, "Splashdown! Apollo has splashdown."],
  "act5.okay": ["CMP", null, "Everybody okay?"],
  "act5.end": ["NARRATOR", null, "July 24, 1969. Eight days, three hours and eighteen minutes after liftoff, Apollo 11 was home."],
}

function sources(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...sources(full))
    else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.') && !full.includes('src/content/')) out.push(full)
  }
  return out
}

describe('the script', () => {
  it('has exactly the agreed lines, speakers, moods and text', () => {
    const ids = Object.keys(LINES).filter((id) => !id.startsWith('test.'))
    expect(ids.sort()).toEqual(Object.keys(WANT).sort())
    for (const [id, [speaker, mood, text]] of Object.entries(WANT)) {
      const l = LINES[id]
      expect(l.speaker, id).toBe(speaker)
      expect(l.mood ?? null, id).toBe(mood)
      expect([l.text, ...(l.more ?? [])].join(' '), id).toBe(text)
    }
  })

  it('splits long lines into parts of 90 characters or fewer, with no dashes', () => {
    for (const [id, l] of Object.entries(LINES)) {
      for (const part of [l.text, ...(l.more ?? [])]) {
        expect(part.length, id).toBeLessThanOrEqual(90)
        expect(part, id).not.toMatch(new RegExp('[\\u2013\\u2014]| -' + '- '))
      }
      if (l.moreSeconds) expect(l.moreSeconds.length, id).toBe(l.more?.length)
    }
  })

  it('names every speaker, including Buzz and the recovery helicopter', () => {
    for (const l of Object.values(LINES)) expect(SPEAKER_NAMES[l.speaker]).toBeDefined()
    expect(SPEAKER_NAMES.LMP).toBe('BUZZ ALDREN')
    expect(SPEAKER_NAMES.SWIM).toBe('SWIM 1')
  })

  it('is subtitles only: no line is voiced and no recording folder exists', () => {
    expect(existsSync('public/audio/vo')).toBe(false)
    expect(Object.values(LINES).some((l) => 'voiced' in l)).toBe(false)
  })

  it('has no line that no flow uses', () => {
    const code = sources('src').map((f) => readFileSync(f, 'utf8')).join('\n')
    const unused = Object.keys(WANT).filter((id) => {
      if (code.includes(`'${id}'`) || code.includes(`"${id}"`)) return false
      // Built from a prefix, such as 'act3.carry.' + who.
      const cut = id.lastIndexOf('.')
      return !code.includes(`'${id.slice(0, cut + 1)}`) && !code.includes(`\`${id.slice(0, cut + 1)}`)
    })
    expect(unused).toEqual([])
  })
})
