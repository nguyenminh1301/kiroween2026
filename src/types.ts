export type ActId =
  | 'act0-pad'
  | 'act1-launch'
  | 'act2-coast'
  | 'act3-farside'
  | 'act4-moon'
  | 'act5-home'

export type Vec3 = { x: number; y: number; z: number }

export type MoveMode = 'walk' | 'zeroG' | 'seated'

export type TensionState = 'CALM' | 'UNEASE' | 'STALK' | 'CHASE' | 'RELEASE'

export type Speaker = 'CDR' | 'CMP' | 'CAPCOM' | 'LOS' | 'UNKNOWN' | 'PAD' | 'NARRATOR' | 'HORNET' | 'LAUNCH' | 'TECH' | 'LMP' | 'SWIM'

export type Mood = 'whisper' | 'shout' | 'distant'

/** The line currently shown by the radio. `speaker` is the id after any override. */
export interface Subtitle {
  speaker: Speaker
  text: string
  mood: Mood | null
  key: number
}
