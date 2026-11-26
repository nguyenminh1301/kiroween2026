// Mutable cabin state read by the cabin scene every frame. Shared by every act that sits in the cabin.
// Plain object, never React state.
import { initialDsky, type DskyState } from './dsky'

export const DEFAULT_SKY = '#9db7c9'

export const cabinState = {
  /** Target window color. The scene eases the windows toward it. */
  sky: DEFAULT_SKY as string,
  engine: 0,
  alarm: false,
  earth: false,
  /** What the windows show. */
  view: 'sky' as 'sky' | 'plasma' | 'sea',
  switchFlipped: false,
  dsky: initialDsky() as DskyState,
  dskyVersion: 0,
}

export function resetCabinState(): void {
  cabinState.sky = DEFAULT_SKY
  cabinState.engine = 0
  cabinState.alarm = false
  cabinState.earth = false
  cabinState.view = 'sky'
  cabinState.switchFlipped = false
  cabinState.dsky = initialDsky()
  cabinState.dskyVersion++
}
