export type Verb = 'GRAB' | 'PULL' | 'FLIP' | 'KEY IN' | 'LOOK BACK' | 'WAVE' | 'SLEEP' | 'HIDE' | 'TALK' | 'TAKE' | 'TAP' | 'ADJUST' | 'CLEAR' | 'OPEN' | 'LAY DOWN' | 'POSE' | 'CLIMB'

/** What the dot shows. PULL (handrails) shows no words. */
export const VERB_LABELS: Record<Verb, string> = {
  GRAB: 'GRAB',
  PULL: '',
  FLIP: 'FLIP',
  'KEY IN': 'KEY IN',
  'LOOK BACK': 'LOOK BACK',
  WAVE: 'WAVE',
  SLEEP: 'GET IN',
  HIDE: 'HIDE',
  TALK: 'TALK',
  TAKE: 'TAKE',
  TAP: 'TAP',
  ADJUST: 'ADJUST',
  CLEAR: 'CLEAR',
  OPEN: 'OPEN',
  'LAY DOWN': 'LAY DOWN',
  POSE: 'POSE',
  CLIMB: 'CLIMB',
}
