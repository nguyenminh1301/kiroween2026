import type { Mood, Speaker } from '../types'

export interface Line {
  speaker: Speaker
  text: string
  mood?: Mood
  /** Reading time in seconds. Defaults to a length based formula. */
  seconds?: number
  /**
   * Parts that follow `text` as one line, each 90 characters or fewer. They play in order
   * as consecutive subtitles with the same speaker and mood.
   */
  more?: string[]
  /** Reading time of each part in `more`. Defaults to the length based formula. */
  moreSeconds?: number[]
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  CDR: 'NEIL ARMSTEAD',
  CMP: 'MIKE COLLIER',
  CAPCOM: 'HOUSTON',
  LOS: 'NO SIGNAL',
  UNKNOWN: 'HOUSTON?',
  PAD: 'GUNTER WENT',
  NARRATOR: '',
  LAUNCH: 'LAUNCH CONTROL',
  TECH: 'PAD CREW',
  HORNET: 'USS HORNET',
  LMP: 'BUZZ ALDREN',
  SWIM: 'SWIM 1',
}

export const LINES: Record<string, Line> = {
  'test.capcom': { speaker: 'CAPCOM', text: 'Columbia, Houston. Radio check.', seconds: 2.5 },
  'test.los': { speaker: 'LOS', text: '[static]', seconds: 2 },

  // Act 0
  'act0.intro1': {
    speaker: 'NARRATOR',
    text: 'July 16, 1969. A million people came to the Cape to watch three men leave the Earth.',
  },
  'act0.intro2': {
    speaker: 'NARRATOR',
    text: "You're Buzz Aldren, lunar module pilot. You board last.",
    more: ['Neil and Mike are already strapped in.'],
  },
  'act0.count': {
    speaker: 'LAUNCH',
    text: 'This is Apollo Saturn Launch Control.',
    more: ['All elements of the Apollo 11 countdown are go at this time.'],
  },
  'act0.tech1': {
    speaker: 'TECH',
    text: 'Morning, Buzz. Clear sky, light wind off the ocean. Good day for it.',
  },
  'act0.tech2': {
    speaker: 'TECH',
    text: "Take a look at the beach road. They've been parked out there all night.",
  },
  'act0.wave': { speaker: 'TECH', text: "They can't hear you from here, but they saw that." },
  'act0.gunter1': {
    speaker: 'PAD',
    text: 'Morning, Buzz. Middle couch. Mind your head on the hatch rim.',
  },
  'act0.gunter2': { speaker: 'PAD', text: 'Have a good trip. See you in eight days.' },
  'act0.board': {
    speaker: 'CDR',
    text: "Morning, Buzz. Get comfortable. We've got two and a half hours to lie here.",
  },

  // Act 1
  'act1.count': {
    speaker: 'LAUNCH',
    text: 'T minus 15 seconds, guidance is internal. 12, 11, 10, 9, ignition sequence start.',
    seconds: 3.4,
  },
  'act1.count2': {
    speaker: 'LAUNCH',
    text: '6, 5, 4, 3, 2, 1, zero. All engines running.',
    seconds: 1.5,
  },
  'act1.liftoff': {
    speaker: 'LAUNCH',
    text: 'Liftoff. We have a liftoff, 32 minutes past the hour. Liftoff on Apollo 11.',
    seconds: 3.2,
  },
  'act1.tower': { speaker: 'LAUNCH', text: 'Tower cleared.', seconds: 1 },
  'act1.roll': { speaker: 'CDR', text: 'Roger. We got a roll program.', seconds: 1.7 },
  'act1.rollok': { speaker: 'CAPCOM', text: 'Roger. Roll.', seconds: 0.9 },
  'act1.maxq': {
    speaker: 'LAUNCH',
    text: "We're through the region of maximum dynamic pressure now.",
    seconds: 2.4,
  },
  'act1.staginggo': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, this is Houston. You are go for staging.',
    seconds: 2.7,
  },
  'act1.staging': { speaker: 'CDR', text: 'Staging. And ignition.', seconds: 1.5 },
  'act1.jettison': { speaker: 'CMP', text: "There goes the tower. We've got windows.", seconds: 2.6 },
  'act1.shutdown': { speaker: 'CDR', text: 'Shutdown.', seconds: 1 },
  'act1.orbit': { speaker: 'CAPCOM', text: 'Roger. Shutdown. We copy 101.4 by 103.6.', seconds: 2.7 },
  'act1.key': { speaker: 'CDR', text: "Buzz, load the burn numbers. They're on the card." },
  'act1.tli': { speaker: 'CAPCOM', text: 'Apollo 11, this is Houston. You are go for TLI. Over.', seconds: 3 },
  'act1.tliack': { speaker: 'CMP', text: 'Apollo 11. Thank you.', seconds: 1.6 },
  'act1.tliburn': { speaker: 'CDR', text: 'Ignition.', seconds: 1.2 },
  'act1.tligo': { speaker: 'CAPCOM', text: 'We confirm ignition, and the thrust is go.', seconds: 2.5 },
  'act1.flashes': {
    speaker: 'CMP',
    text: 'Flashes out window number 5. Could be the engine.',
    seconds: 3.2,
  },
  'act1.ride': {
    speaker: 'CDR',
    text: 'Hey, Houston, Apollo 11. That Saturn gave us a magnificent ride.',
    seconds: 3.6,
  },
  'act1.rideok': {
    speaker: 'CAPCOM',
    text: "Roger, 11. We'll pass that on. It certainly looks like you are well on your way now.",
    seconds: 4.6,
  },
  'act1.earth': { speaker: 'CMP', text: 'Look out the left window, Buzz. You can see all of Africa.' },
  'act1.rest': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, Houston. Everything looks good down here. Get some rest.',
  },

  // Act 2
  'act2.jobs': {
    speaker: 'CAPCOM',
    text: "Hello, Apollo 11. Houston. We've got a few items for you before your rest period.",
  },
  'act2.out': { speaker: 'CDR', text: "The list's on the wall, Buzz. Two up here and one down in Eagle." },
  'act2.o2': {
    speaker: 'CAPCOM',
    text: "Apollo 11, Houston. We've been noting some funnies on the O2 flow indicator.",
  },
  'act2.o2b': { speaker: 'CMP', text: 'That line rattles every time. Give the joint a couple of taps.' },
  'act2.o2done': { speaker: 'CAPCOM', text: 'Roger. O2 flow looks normal now.' },
  'act2.press': { speaker: 'CMP', text: "Cabin pressure's reading low. Bring it back up to five." },
  'act2.pressdone': { speaker: 'CAPCOM', text: 'Roger. We see five point zero.' },
  'act2.comp': { speaker: 'CMP', text: "Eagle's computer is throwing lights. Clear them one at a time." },
  'act2.compdone': { speaker: 'CAPCOM', text: "Roger. Eagle's computer looks clean from here." },
  'act2.longer': { speaker: 'CMP', text: "You were down there a while. How's Eagle?" },
  'act2.sleep': {
    speaker: 'CAPCOM',
    text: 'Hello, Apollo 11. Houston.',
    more: ['As the Sun sinks slowly in the west, the White Team bids you good night.'],
  },
  'act2.sleepack': { speaker: 'CDR', text: 'Good night, Houston. Lights out, Buzz.' },

  // Act 3
  'act3.around': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, this is Houston. All your systems are looking good going around the corner,',
    more: ["and we'll see you on the other side."],
    seconds: 4.6,
  },
  'act3.aroundack': { speaker: 'CDR', text: 'Roger. Everything looks okay up here.', seconds: 2.6 },
  'act3.los': { speaker: 'LOS', text: 'Loss of signal.', seconds: 3.5 },
  'act3.impostor': { speaker: 'CAPCOM', text: 'Columbia, Houston. Say again, how many aboard?' },
  'act3.hold': { speaker: 'CDR', mood: 'whisper', text: "Buzz. Don't breathe." },
  'act3.heard': { speaker: 'CDR', mood: 'shout', text: 'It heard you. Hide!' },
  'act3.lost': { speaker: 'CDR', mood: 'whisper', text: "It's gone. Go." },
  'act3.cage': { speaker: 'CDR', mood: 'whisper', text: 'Buzz. Up here. Get us down.' },
  'act3.carry.cdr': { speaker: 'CDR', mood: 'whisper', text: 'Easy. It can hear everything.' },
  'act3.carry.cmp': { speaker: 'CMP', mood: 'whisper', text: "Slow, Buzz. It's close." },
  'act3.down.cdr': { speaker: 'CDR', mood: 'whisper', text: 'Go back for Mike.' },
  'act3.down.cmp': { speaker: 'CMP', mood: 'whisper', text: "Neil's still down there." },
  'act3.wake.cmp': { speaker: 'CMP', text: 'Buzz. Hey. Buzz. You were shouting.' },
  'act3.wake.cdr': { speaker: 'CDR', text: 'You all right over there?' },
  'act3.reply.dream': { speaker: 'CMP', text: 'Happens up here. Have some water.' },
  'act3.reply.fine': { speaker: 'CDR', text: 'Okay. Get some sleep. We land tomorrow.' },

  // Act 4
  'act4.go': {
    speaker: 'CMP',
    text: 'Eagle, this is Columbia. They just gave you a go for powered descent.',
    seconds: 3.6,
  },
  'act4.alarm': { speaker: 'CDR', text: "Program alarm. It's a 1202.", seconds: 1.8 },
  'act4.alarmask': { speaker: 'CDR', text: 'Give us a reading on the 1202 program alarm.', seconds: 2.6 },
  'act4.goalarm': { speaker: 'CAPCOM', text: "Roger. We're go on that alarm.", seconds: 2 },
  'act4.landing': { speaker: 'CAPCOM', text: "Eagle, Houston. You're go for landing.", seconds: 1.6 },
  'act4.dust': { speaker: 'LMP', text: '40 feet, down two and a half. Picking up some dust.', seconds: 3 },
  'act4.sixty': { speaker: 'CAPCOM', text: '60 seconds.', seconds: 1 },
  'act4.thirty': { speaker: 'CAPCOM', text: '30 seconds.', seconds: 1 },
  'act4.contact': { speaker: 'LMP', text: 'Contact light.', seconds: 1 },
  'act4.stop': { speaker: 'CDR', text: 'Shutdown.', seconds: 1 },
  'act4.stopack': { speaker: 'LMP', text: 'Okay. Engine stop.', seconds: 1.4 },
  'act4.landed': { speaker: 'CDR', text: 'Houston, Tranquility Base here. The Eagle has landed.', seconds: 3 },
  'act4.landedok': {
    speaker: 'CAPCOM',
    text: 'Roger, Tranquility. We copy you on the ground.',
    more: ["You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot."],
    seconds: 2.6,
    moreSeconds: [4.4],
  },
  'act4.foot': {
    speaker: 'CDR',
    text: "I'm at the foot of the ladder. I'm going to step off the LM now.",
    seconds: 3.6,
  },
  'act4.step': {
    speaker: 'CDR',
    text: 'That\'s one small step for man, one giant leap for mankind.',
    seconds: 4.6,
  },
  'act4.down': {
    speaker: 'CDR',
    text: 'Okay, Buzz. Come on down. It takes a pretty good little jump at the bottom.',
    seconds: 5,
  },
  'act4.view': { speaker: 'LMP', text: 'Beautiful view!', seconds: 2.4 },
  'act4.viewcdr': { speaker: 'CDR', text: 'Isn\'t that something! Magnificent sight out here.', seconds: 3.2 },
  'act4.desolation': { speaker: 'LMP', text: 'Magnificent desolation.', seconds: 2.6 },
  'act4.flagtask': { speaker: 'CDR', text: "Flag's on the ladder leg. Let's put it up by the marker." },
  'act4.flagup': {
    speaker: 'CAPCOM',
    text: "Columbia, they've got the flag up now,",
    more: ['and you can see the stars and stripes on the lunar surface.'],
  },
  'act4.flagcmp': { speaker: 'CMP', text: 'Beautiful. Just beautiful.' },
  'act4.photo': { speaker: 'CDR', text: 'Stand by the flag, Buzz. Hold still.', seconds: 2.6 },
  'act4.photodone': { speaker: 'CDR', text: 'Got it.', seconds: 1.4 },
  'act4.jobs': {
    speaker: 'CDR',
    text: "I'll get the samples started. Scoop and seismometer are in the bay.",
  },
  'act4.takescoop': { speaker: 'CDR', text: 'Fill a bag from the fine stuff by the marker.' },
  'act4.sample': {
    speaker: 'CDR',
    text: "It's a very soft surface, but here and there you hit something hard. Bag it.",
  },
  'act4.takeseismo': { speaker: 'CDR', text: 'Seismometer goes on that flat spot.' },
  'act4.seismo': {
    speaker: 'CAPCOM',
    text: 'Tranquility Base, Houston. The passive seismic experiment has been uncaged',
    more: ["and we're observing short period oscillations."],
  },
  'act4.orbit': { speaker: 'CMP', text: "Houston, Columbia on the high gain. How's it going?" },
  'act4.orbitok': { speaker: 'CAPCOM', text: 'The EVA is progressing beautifully.' },
  'act4.back': { speaker: 'CAPCOM', text: 'Head on up the ladder, Buzz.' },
  'act4.adios': { speaker: 'LMP', text: 'Okay. Adios, amigos.' },
  'act4.far': { speaker: 'CDR', text: "That's far enough. Stay close to the lander." },
  'act4.liftoff': {
    speaker: 'LMP',
    text: '9, 8, 7, 6, 5. Abort stage, engine arm, ascent, proceed.',
    seconds: 3.4,
  },
  'act4.off': {
    speaker: 'CDR',
    text: "We're off. Look at that stuff go all over the place.",
    seconds: 2.6,
  },
  'act4.quiet': { speaker: 'LMP', text: 'Beautiful. Very quiet ride.', seconds: 2.2 },
  'act4.flagdown': { speaker: 'LMP', text: 'There goes the flag.', seconds: 2 },
  'act4.columbia': {
    speaker: 'CMP',
    text: "Eagle, Columbia. I've got you in the sextant. Come on home.",
  },

  // Act 5
  'act5.cleared': {
    speaker: 'CAPCOM',
    text: "Apollo 11, Houston. You're still looking mighty fine from here.",
    more: ["You're cleared for landing."],
    moreSeconds: [1.8],
    seconds: 3.4,
  },
  'act5.gear': { speaker: 'LMP', text: 'Roger. Gears down and locked.', seconds: 1.8 },
  'act5.hill': {
    speaker: 'CAPCOM',
    text: "You're going over the hill there shortly. You're looking mighty fine to us.",
    seconds: 3.8,
  },
  'act5.later': { speaker: 'CDR', text: 'See you later.', seconds: 1.4 },
  'act5.blackout': { speaker: 'CMP', text: 'There goes the radio.', seconds: 2 },
  'act5.aria': { speaker: 'CAPCOM', text: 'Apollo 11, Houston through ARIA. Standing by. Over.', seconds: 2.4 },
  'act5.airboss': { speaker: 'CAPCOM', text: 'Apollo 11, Houston. Air Boss has visual contact.', seconds: 2.4 },
  'act5.drogues': { speaker: 'CDR', text: 'Drogues.', seconds: 1.4 },
  'act5.mains': { speaker: 'CDR', text: 'Three good mains.', seconds: 2 },
  'act5.hornet': { speaker: 'HORNET', text: 'Apollo 11, Apollo 11. This is Hornet. Over.', seconds: 2.4 },
  'act5.hornetack': {
    speaker: 'CDR',
    text: 'Hello, Hornet. This is Apollo 11, reading you loud and clear.',
    seconds: 3.2,
  },
  'act5.alt': { speaker: 'CDR', text: 'Apollo 11 at 1500 feet.', seconds: 2.2 },
  'act5.swim': { speaker: 'SWIM', text: "Roger. You're looking real good.", seconds: 2.2 },
  'act5.splash': { speaker: 'SWIM', text: 'Splashdown! Apollo has splashdown.', seconds: 2.4 },
  'act5.okay': { speaker: 'CMP', text: 'Everybody okay?', seconds: 2 },
  'act5.end': {
    speaker: 'NARRATOR',
    text: 'July 24, 1969. Eight days, three hours and eighteen minutes after liftoff,',
    more: ['Apollo 11 was home.'],
  },
}
