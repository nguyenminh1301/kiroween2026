// Mutable act 1 state read by the scene every frame. Plain object, never React state.
import { initialDsky, type DskyState } from './dsky'
import { SKY, type View } from './timelines'

export const act1State = {
  view: 'cabin' as View,
  /** Target sky color. The scene eases the windows toward it. */
  sky: SKY.pad as string,
  engine: 0,
  alarm: false,
  earth: false,
  /** Launch timeline seconds, or 0 before it starts. */
  launchT: 0,
  /** TLI timeline seconds, or 0 before it starts. */
  tliT: 0,
  ignited: false,
  switchFlipped: false,
  dsky: initialDsky() as DskyState,
  dskyVersion: 0,
}

export function resetAct1State(): void {
  act1State.view = 'cabin'
  act1State.sky = SKY.pad
  act1State.engine = 0
  act1State.alarm = false
  act1State.earth = false
  act1State.launchT = 0
  act1State.tliT = 0
  act1State.ignited = false
  act1State.switchFlipped = false
  act1State.dsky = initialDsky()
  act1State.dskyVersion++
}
