import type { ActId } from '../types'

export const ACT_ORDER: readonly ActId[] = [
  'act0-pad',
  'act1-launch',
  'act2-coast',
  'act3-farside',
  'act4-moon',
  'act5-home',
]

export function nextAct(id: ActId): ActId | null {
  const i = ACT_ORDER.indexOf(id)
  if (i < 0 || i >= ACT_ORDER.length - 1) return null
  return ACT_ORDER[i + 1]
}
