import type { Mood, Speaker } from '../types'

export interface Line {
  speaker: Speaker
  text: string
  mood?: Mood
  voiced?: boolean
  /** Reading time in seconds. Defaults to a length based formula. */
  seconds?: number
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  CDR: 'NEIL ARMSTEAD',
  CMP: 'MIKE COLLIER',
  CAPCOM: 'HOUSTON',
  LOS: 'NO SIGNAL',
  UNKNOWN: 'HOUSTON?',
  PAD: 'GUNTER WENT',
  NARRATOR: '',
  HORNET: 'USS HORNET',
}

export const LINES: Record<string, Line> = {
  'test.capcom': { speaker: 'CAPCOM', text: 'Columbia, Houston. Radio check.', seconds: 2.5 },
  'test.los': { speaker: 'LOS', text: '[static]', seconds: 2 },
  'act0.intro1': {
    speaker: 'NARRATOR',
    voiced: true,
    text: 'July 16, 1969. A million people came to the Cape to watch three men leave the Earth.',
  },
  'act0.intro2': {
    speaker: 'NARRATOR',
    voiced: true,
    text: 'You are one of the three. Before you climb in, look down. They came for you.',
  },
  'act0.pad1': {
    speaker: 'PAD',
    text: 'Hear that? Go to the rail and wave. Some of them drove all night for this.',
  },
  'act0.pad2': {
    speaker: 'PAD',
    mood: 'shout',
    text: 'Ha! They saw you, Buzz! Okay, hero. Hatch is in the White Room, end of the arm.',
  },
  'act0.pad3': {
    speaker: 'PAD',
    text: 'Strange. I counted four sets of boot prints up here this morning.',
  },
  'act0.board': {
    speaker: 'CDR',
    text: 'There you are, Buzz. Strap in. We have a Moon to catch.',
  },
  'act1.count': {
    speaker: 'CAPCOM',
    text: 'Twelve, eleven, ten, nine. Ignition sequence start.',
    seconds: 4,
  },
  'act1.liftoff': { speaker: 'CAPCOM', mood: 'shout', text: 'Liftoff! We have a liftoff!', seconds: 3 },
  'act1.staging': {
    speaker: 'CDR',
    text: 'Staging. Look up at the window, Buzz. Watch the sky go out.',
  },
  'act1.o2': {
    speaker: 'CDR',
    text: 'Huh. Cabin oxygen is running high. That is what four men would breathe.',
  },
  'act1.switch': {
    speaker: 'CDR',
    text: 'Probably a bad sensor. Kill it. Red switch, right by your hand.',
  },
  'act1.key': {
    speaker: 'CDR',
    text: 'Good. Now the computer in front of you. Three presses and we leave orbit.',
  },
  'act1.tli': { speaker: 'CAPCOM', text: 'Apollo 11, Houston. You are go for TLI.' },
  'act1.earth': {
    speaker: 'CMP',
    text: 'Oh, would you look at that. The whole Earth fits in the window.',
  },
  'act1.moon': { speaker: 'CDR', text: 'And that little one is where we are going.' },
  'act1.rest': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, Houston. You are on your way. Get some rest, it is a long drive.',
  },
  'act2.night': {
    speaker: 'CMP',
    text: 'Neil and I are turning in. Do not stay down there all night, Buzz.',
  },
  'act2.out': {
    speaker: 'CDR',
    text: 'Houston wants that lander fault checked before we sleep. Float down and take a look.',
  },
  'act2.breaker': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'Engine arm breaker. The knob snapped off. Find something to push it in with.',
  },
  'act2.pen': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'A pen. That will do. Push the breaker in with it.',
  },
  'act2.fixed': {
    speaker: 'CDR',
    mood: 'distant',
    text: 'That did it. Come on back up, we are turning in.',
  },
  'act2.longer': {
    speaker: 'CMP',
    text: 'You were gone a while. That tunnel is three pushes. Did you get lost in there?',
  },
  'act2.sleep': { speaker: 'CDR', text: 'Lights out. Get in your bag, Buzz. Big day tomorrow.' },
  'act2.flashes': {
    speaker: 'CMP',
    mood: 'whisper',
    text: 'You see the flashes too? Every time I shut my eyes.',
  },
  'act2.breath': {
    speaker: 'CMP',
    mood: 'whisper',
    text: 'Who is breathing like that? There are only three of us in here.',
  },
  'act3.los': { speaker: 'LOS', text: 'Loss of signal. No Houston until we come around.', seconds: 3.5 },
  'act3.wake': {
    speaker: 'CDR',
    mood: 'whisper',
    text: 'Buzz. Wake up. Quietly. Mike is gone and the hatch is open.',
  },
  'act3.wake2': {
    speaker: 'CDR',
    mood: 'whisper',
    text: 'I heard him down the tunnel. Go get him. I will hold the hatch.',
  },
  'act3.call1': {
    speaker: 'CMP',
    mood: 'distant',
    text: 'Hey. Down here. I can not feel my legs.',
  },
  'act3.see': {
    speaker: 'CDR',
    mood: 'whisper',
    text: 'Stop. Something moved down there. Get in that locker on your left. Now.',
  },
  'act3.hold': { speaker: 'CDR', mood: 'whisper', text: 'Hold your breath. Do not make a sound.' },
  'act3.passed': {
    speaker: 'CDR',
    mood: 'whisper',
    text: 'It went by. It hunts by sound. Move slow, and get in a locker if it turns.',
  },
  'act3.impostor': { speaker: 'CAPCOM', text: 'Columbia, Houston. Say again, how many crew aboard?' },
  'act3.nohouston': {
    speaker: 'CDR',
    mood: 'whisper',
    text: 'That is not Houston. We are behind the Moon. Nobody can reach us here.',
  },
  'act3.call2': {
    speaker: 'CMP',
    mood: 'distant',
    text: 'Do not let it hear you. It hears everything.',
  },
  'act3.heard': { speaker: 'CDR', mood: 'shout', text: 'It heard you! Get in a locker!' },
  'act3.lost': { speaker: 'CDR', mood: 'whisper', text: 'It lost you. Breathe. Keep going.' },
  'act3.found': {
    speaker: 'CMP',
    mood: 'whisper',
    text: 'You came. Do not move. It is right behind me.',
  },
  'act3.cmp': {
    speaker: 'CMP',
    mood: 'shout',
    text: 'Go! I am right behind you! Get to the hatch!',
  },
  'act3.cdr.call1': {
    speaker: 'CDR',
    mood: 'shout',
    text: 'Come to my voice! Keep pushing off the rails!',
  },
  'act3.cdr.call2': { speaker: 'CDR', mood: 'shout', text: 'Do not stop! Do not look back!' },
  'act3.cdr.call3': { speaker: 'CDR', mood: 'shout', text: 'I can see your light! Almost here!' },
  'act3.slam': {
    speaker: 'CDR',
    mood: 'shout',
    text: 'Got you! Hatch is shut! Hold it, Mike, hold it!',
  },
  'act3.cmp.plan': { speaker: 'CMP', text: 'It follows noise. It followed me in here.' },
  'act3.cdr.plan': {
    speaker: 'CDR',
    text: 'Then we take it down with us, and we leave it on the Moon.',
  },
  'act4.go': { speaker: 'CAPCOM', text: 'Eagle, Houston. You are go for powered descent.' },
  'act4.alarm': { speaker: 'CDR', text: 'Program alarm. Twelve oh two. What is that?' },
  'act4.goalarm': { speaker: 'CAPCOM', text: 'We are go on that alarm. Keep going.' },
  'act4.sixty': { speaker: 'CAPCOM', text: 'Sixty seconds.', seconds: 2 },
  'act4.thirty': { speaker: 'CAPCOM', text: 'Thirty seconds.', seconds: 2 },
  'act4.contact': { speaker: 'CDR', text: 'Contact light. Engine stop. We are down.' },
  'act4.flagtask': {
    speaker: 'CDR',
    text: 'Flag is rolled up on the ladder leg. Houston wants it on camera.',
  },
  'act4.jobs': {
    speaker: 'CDR',
    text: 'Scoop and seismometer are in the equipment bay. Do them in any order.',
  },
  'act4.plant': { speaker: 'CDR', text: 'See the marker out there? Plant it there.' },
  'act4.takescoop': { speaker: 'CDR', text: 'Scoop. Fill a bag at the marker, from the fine stuff.' },
  'act4.takeseismo': { speaker: 'CDR', text: 'Set the seismometer down on that flat spot.' },
  'act4.flag': { speaker: 'CDR', text: 'Earth has a flag on the Moon. Somebody back home is crying.' },
  'act4.sample': { speaker: 'CDR', text: 'Got it. First handful of the Moon anybody ever held.' },
  'act4.seismo': {
    speaker: 'CAPCOM',
    text: 'Tranquility, we see the seismometer. Wait. It is picking up something big.',
  },
  'act4.emerge': {
    speaker: 'CDR',
    mood: 'shout',
    text: 'Buzz! The crater behind you! Run for the ladder!',
  },
  'act4.liftoff': {
    speaker: 'CDR',
    mood: 'shout',
    text: 'It is on the descent stage! Fire the engine! Burn it!',
  },
  'act4.burned': {
    speaker: 'CDR',
    text: 'It went up with the descent stage. It is not coming with us.',
  },
  'act4.columbia': {
    speaker: 'CMP',
    text: 'Eagle, Columbia. I have you in the sextant. Come on up, I kept your seats warm.',
  },
  'act5.entry': { speaker: 'CDR', text: 'Entry interface. Here comes the atmosphere. Hang on.' },
  'act5.blackout': {
    speaker: 'CMP',
    text: 'There goes the radio. For three minutes nobody can hear us.',
  },
  'act5.radar': { speaker: 'CAPCOM', text: 'Apollo 11, Houston. We have you on radar. Welcome back.' },
  'act5.mains': {
    speaker: 'CDR',
    text: 'Three good mains. Mike, look out the window. That is ocean.',
  },
  'act5.splash': {
    speaker: 'CMP',
    mood: 'shout',
    text: 'Splashdown! We are down! Buzz, we are home!',
  },
  'act5.hornet': {
    speaker: 'HORNET',
    text: 'Columbia, Hornet. Swimmers are in the water. Stay put, we are coming to get you.',
  },
  'act5.end': {
    speaker: 'NARRATOR',
    voiced: true,
    text: 'Three men came home from the Moon. What came up with them stayed there, burned.',
  },
}
