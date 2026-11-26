// The four act 2 repairs as pure state machines: oxygen line, cabin pressure, breaker panel and landing site keypad.
// No Three.js or React imports.
import { ACT2_TEXT } from '../../content/checklists'

export const TAPS_NEEDED = 3

/** Breaker panel: six switches. The card shows which ones go up. */
export const PANEL_SWITCHES = 6
export const PANEL_CARD: readonly boolean[] = [true, false, true, true, false, true]
export const PANEL_START: readonly boolean[] = [false, true, false, false, true, false]

/** Landing site keypad: five digits then ENTR. */
export const SITE_DIGITS = '02471'

/** The gauge: knob 0..1 moves the needle between PSI_MIN and PSI_MAX. */
export const PSI_MIN = 2.5
export const PSI_MAX = 7.5
export const BAND_LO = 4.7
export const BAND_HI = 5.3
export const HOLD_SECONDS = 1
export const GAUGE_START_KNOB = 0.1
/** Knob speed with A or D, in knob units per second, and per wheel unit. */
export const KNOB_SPEED = 0.3
export const WHEEL_STEP = 0.0004
const NEEDLE_RATE = 5

export const knobToPsi = (knob: number): number => PSI_MIN + (PSI_MAX - PSI_MIN) * knob
/** The needle angle in radians for a pressure: from 8 o'clock round to 4 o'clock, 0 at twelve. */
export const needleAngle = (psi: number): number => -2.1 + ((psi - PSI_MIN) / (PSI_MAX - PSI_MIN)) * 4.2
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

export interface RepairsState {
  hammerHeld: boolean
  taps: number
  o2Done: boolean
  gaugeOpen: boolean
  knob: number
  needle: number
  /** Seconds the needle has stayed inside the band. */
  held: number
  pressDone: boolean
  panelOpen: boolean
  panel: boolean[]
  panelDone: boolean
  keypadOpen: boolean
  entry: string
  /** OPR ERR is lit after a wrong number. */
  oprErr: boolean
  siteDone: boolean
}

export type RepairKind = 'o2' | 'press' | 'panel' | 'site'

/** What ENTR did: not five digits yet, a wrong number, or the right one. */
export type EntrResult = 'short' | 'err' | 'ok'

export interface Repairs {
  readonly s: RepairsState
  takeHammer(): boolean
  /** One tap on the joint. Returns the tap number, or 0 when ignored. */
  tap(): number
  openGauge(): boolean
  closeGauge(): void
  /** Turn the knob by `delta` knob units. Only while the gauge is open. */
  turn(delta: number): void
  /** Advance the needle. Returns 'press' on the tick the repair completes. */
  tick(dt: number): RepairKind | null
  openPanel(): boolean
  closePanel(): void
  /** Flip breaker `i`. Returns true when the panel now matches the card. */
  flip(i: number): boolean
  openKeypad(): boolean
  closeKeypad(): void
  /** A digit key. Ignored when the keypad is shut or already has five. */
  digit(d: string): boolean
  backspace(): void
  enter(): EntrResult
  allDone(): boolean
  doneCount(): number
}

export function createRepairs(): Repairs {
  const s: RepairsState = {
    hammerHeld: false,
    taps: 0,
    o2Done: false,
    gaugeOpen: false,
    knob: GAUGE_START_KNOB,
    needle: knobToPsi(GAUGE_START_KNOB),
    held: 0,
    pressDone: false,
    panelOpen: false,
    panel: [...PANEL_START],
    panelDone: false,
    keypadOpen: false,
    entry: '',
    oprErr: false,
    siteDone: false,
  }
  return {
    s,
    takeHammer() {
      if (s.hammerHeld || s.o2Done) return false
      s.hammerHeld = true
      return true
    },
    tap() {
      if (!s.hammerHeld || s.o2Done) return 0
      s.taps++
      if (s.taps >= TAPS_NEEDED) {
        s.o2Done = true
        s.hammerHeld = false
      }
      return s.taps
    },
    openGauge() {
      if (s.pressDone || s.gaugeOpen) return false
      s.gaugeOpen = true
      s.held = 0
      return true
    },
    closeGauge() {
      s.gaugeOpen = false
      s.held = 0
    },
    turn(delta) {
      if (!s.gaugeOpen || !Number.isFinite(delta)) return
      s.knob = clamp01(s.knob + delta)
    },
    tick(dt) {
      if (!(dt > 0)) return null
      // The needle follows the knob with a short lag, and keeps moving after the dial closes.
      const target = knobToPsi(s.knob)
      s.needle += (target - s.needle) * Math.min(1, dt * NEEDLE_RATE)
      if (!s.gaugeOpen || s.pressDone) return null
      if (s.needle >= BAND_LO && s.needle <= BAND_HI) s.held += dt
      else s.held = 0
      if (s.held >= HOLD_SECONDS) {
        s.pressDone = true
        s.gaugeOpen = false
        s.needle = knobToPsi(s.knob)
        return 'press'
      }
      return null
    },
    openPanel() {
      if (s.panelDone || s.panelOpen) return false
      s.panelOpen = true
      return true
    },
    closePanel() {
      s.panelOpen = false
    },
    flip(i) {
      if (!s.panelOpen || s.panelDone || !Number.isInteger(i) || i < 0 || i >= PANEL_SWITCHES) return false
      s.panel[i] = !s.panel[i]
      if (s.panel.every((v, k) => v === PANEL_CARD[k])) {
        s.panelDone = true
        s.panelOpen = false
        return true
      }
      return false
    },
    openKeypad() {
      if (s.siteDone || s.keypadOpen) return false
      s.keypadOpen = true
      s.entry = ''
      s.oprErr = false
      return true
    },
    closeKeypad() {
      s.keypadOpen = false
    },
    digit(d) {
      if (!s.keypadOpen || s.siteDone || !/^[0-9]$/.test(d) || s.entry.length >= SITE_DIGITS.length) return false
      s.oprErr = false
      s.entry += d
      return true
    },
    backspace() {
      if (!s.keypadOpen || s.siteDone) return
      s.entry = s.entry.slice(0, -1)
      s.oprErr = false
    },
    enter() {
      if (!s.keypadOpen || s.siteDone || s.entry.length < SITE_DIGITS.length) return 'short'
      if (s.entry !== SITE_DIGITS) {
        s.oprErr = true
        s.entry = ''
        return 'err'
      }
      s.siteDone = true
      s.keypadOpen = false
      return 'ok'
    },
    allDone: () => s.o2Done && s.pressDone && s.panelDone && s.siteDone,
    doneCount: () => Number(s.o2Done) + Number(s.pressDone) + Number(s.panelDone) + Number(s.siteDone),
  }
}

/** The paper strip text and the interactables to frame, from what is left to do. */
export function repairObjective(s: RepairsState): { text: string; markers: string[] } {
  const left: string[] = []
  const markers: string[] = []
  if (!s.o2Done) {
    left.push(s.hammerHeld ? ACT2_TEXT.o2Tap : ACT2_TEXT.o2Hammer)
    markers.push(s.hammerHeld ? 'act2:joint' : 'act2:pouch')
  }
  if (!s.pressDone) {
    left.push(ACT2_TEXT.press)
    markers.push('act2:gauge')
  }
  if (!s.panelDone) {
    left.push(ACT2_TEXT.panel)
    markers.push('act2:panel')
  }
  if (!s.siteDone) {
    left.push(ACT2_TEXT.site)
    markers.push('act2:keypad')
  }
  return { text: ACT2_TEXT.prefix + left.join(', '), markers }
}
