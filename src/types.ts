export type ActId =
  | 'act0-pad'
  | 'act1-launch'
  | 'act2-coast'
  | 'act3-farside'
  | 'act4-moon'
  | 'act5-home'

export type Vec3 = { x: number; y: number; z: number }

export type MoveMode = 'walk' | 'zeroG' | 'seated'
