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
  LAUNCH: 'LAUNCH CONTROL',
  TECH: 'PAD CREW',
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
    text: "You're Buzz Aldren, lunar module pilot. Neil and Mike are already aboard.",
  },
  'act0.tech1': {
    speaker: 'TECH',
    text: "Morning, Buzz. Wind's calm, sky's clear. Couldn't ask for better.",
  },
  'act0.tech2': {
    speaker: 'TECH',
    text: 'Give the beach a wave. Some of them have been out there since last night.',
  },
  'act0.wave': { speaker: 'TECH', mood: 'shout', text: 'Hear that? They saw you.' },
  'act0.gunter1': {
    speaker: 'PAD',
    text: "Morning, Buzz. You're in the middle couch. Watch your head going in.",
  },
  'act0.gunter2': { speaker: 'PAD', text: 'See you when you get back.' },
  'act0.board': { speaker: 'CDR', text: "Morning, Buzz. Get strapped in, we're right on time." },
  'act1.count': {
    speaker: 'LAUNCH',
    text: 'Twelve, eleven, ten, nine. Ignition sequence start.',
    seconds: 4,
  },
  'act1.liftoff': { speaker: 'LAUNCH', mood: 'shout', text: 'Liftoff! We have a liftoff!', seconds: 3 },
  'act1.clock': { speaker: 'CDR', text: 'Liftoff. The clock is running.', seconds: 3 },
  'act1.tower': { speaker: 'CAPCOM', text: "Roger. You've cleared the tower.", seconds: 3 },
  'act1.roll': { speaker: 'CDR', text: 'Roll program.', seconds: 2 },
  'act1.rollok': { speaker: 'CAPCOM', text: 'Roger, roll.', seconds: 2 },
  'act1.maxq': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, Houston. Through max Q. Thrust is good on all five.',
    seconds: 4.5,
  },
  'act1.staging': { speaker: 'CDR', text: "Staging. And we've got ignition on the second stage.", seconds: 4 },
  'act1.jettison': {
    speaker: 'CDR',
    text: "Tower's gone. The cover went with it. We have windows.",
    seconds: 4,
  },
  'act1.sky': { speaker: 'CMP', text: "Sky's already black out there.", seconds: 3 },
  'act1.orbit': {
    speaker: 'CAPCOM',
    text: "Apollo 11, Houston. Shutdown confirmed. You're in orbit.",
    seconds: 4.5,
  },
  'act1.key': {
    speaker: 'CDR',
    text: "Computer's yours, Buzz. Key in what's on the card.",
  },
  'act1.tli': { speaker: 'CAPCOM', text: 'Apollo 11, this is Houston. You are go for TLI.' },
  'act1.tliburn': { speaker: 'CDR', text: "Ignition. There's the push.", seconds: 3 },
  'act1.tlidone': { speaker: 'CMP', text: "Shutdown. That's it, we're on our way.", seconds: 3.5 },
  'act1.earth': { speaker: 'CMP', text: "Look out your window, Buzz. That's the whole Earth." },
  'act1.look': {
    speaker: 'CDR',
    text: "Take a good look. We won't see it that size again for a week.",
  },
  'act1.rest': {
    speaker: 'CAPCOM',
    text: "Apollo 11, Houston. Nice burn. Get some rest, you've got three days.",
  },
  'act2.jobs': {
    speaker: 'CAPCOM',
    text: 'Apollo 11, Houston. A few housekeeping items before your rest period.',
  },
  'act2.out': { speaker: 'CDR', text: "List's on the wall, Buzz. Some up here, some down in Eagle." },
  'act2.o2': {
    speaker: 'CMP',
    text: 'Hear that rattle? Oxygen line again. A couple of taps usually settles it.',
  },
  'act2.o2done': { speaker: 'CAPCOM', text: 'Roger. Oxygen flow is steady.' },
  'act2.press': {
    speaker: 'CDR',
    text: "Cabin pressure's a little low. Bring it back up to five.",
  },
  'act2.pressdone': { speaker: 'CAPCOM', text: 'Copy, five point zero.' },
  'act2.panel': {
    speaker: 'CMP',
    text: "Breakers on that panel don't match the card. Set them like it says.",
  },
  'act2.paneldone': { speaker: 'CAPCOM', text: 'Panel looks good from here.' },
  'act2.site': {
    speaker: 'CDR',
    text: "Eagle's computer wants the landing site numbers. They're on the card.",
  },
  'act2.sitedone': { speaker: 'CAPCOM', text: 'We copy the site. Eagle is ready.' },
  'act2.longer': {
    speaker: 'CMP',
    text: "You were gone a while. It's three pushes down that tunnel.",
  },
  'act2.sleep': { speaker: 'CDR', text: "That's the list. Lights out, Buzz. Big day tomorrow." },
  'act3.los': { speaker: 'LOS', text: 'Loss of signal.', seconds: 3.5 },
  'act3.impostor': { speaker: 'CAPCOM', text: 'Columbia, Houston. Say again, how many crew aboard?' },
  'act3.hold': { speaker: 'CDR', mood: 'whisper', text: 'Buzz. Hold your breath.' },
  'act3.heard': { speaker: 'CDR', mood: 'shout', text: 'It heard you. Hide!' },
  'act3.lost': { speaker: 'CDR', mood: 'whisper', text: "It's gone. Keep moving." },
  'act3.cage': { speaker: 'CDR', mood: 'whisper', text: 'Buzz. Up here. Get us down.' },
  'act3.carry.cdr': { speaker: 'CDR', mood: 'whisper', text: 'Easy. Every sound carries.' },
  'act3.carry.cmp': { speaker: 'CMP', mood: 'whisper', text: "Slow, Buzz. It's close." },
  'act3.down.cdr': { speaker: 'CDR', mood: 'whisper', text: 'Go back for Mike.' },
  'act3.down.cmp': { speaker: 'CMP', mood: 'whisper', text: "Neil's still down there. Go." },
  'act3.wake.cmp': { speaker: 'CMP', text: 'Buzz! Hey, hey. You were shouting.' },
  'act3.wake.cdr': { speaker: 'CDR', text: 'You okay over there?' },
  'act3.reply.dream': { speaker: 'CMP', text: 'Happens up here. Drink some water and try again.' },
  'act3.reply.fine': { speaker: 'CDR', text: 'Okay. Get some sleep, we land tomorrow.' },
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
  'act4.flag': { speaker: 'CDR', text: 'Flag is up. Houston, you should have it on camera.' },
  'act4.sample': { speaker: 'CDR', text: 'Got it. First handful of the Moon anybody ever held.' },
  'act4.photo': { speaker: 'CDR', text: 'Stand by the flag, Buzz. Let me get your picture.' },
  'act4.seismo': {
    speaker: 'CAPCOM',
    text: 'Tranquility, we see the seismometer. It is already picking up your footsteps.',
  },
  'act4.back': { speaker: 'CDR', text: 'That is everything. Head back to the ladder.' },
  'act4.far': { speaker: 'CDR', text: 'Not so far, Buzz. Stay where I can see you.' },
  'act4.liftoff': { speaker: 'CDR', text: 'Engine arm, ascent. Proceed.' },
  'act4.flagdown': { speaker: 'CDR', text: 'There goes the flag. The blast knocked it flat.' },
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
