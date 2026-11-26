export type Verb = 'GRAB' | 'PULL' | 'FLIP' | 'KEY IN' | 'LOOK BACK' | 'WAVE' | 'SLEEP' | 'HIDE' | 'TALK'

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
}
