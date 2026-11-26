// Read-only facts an act publishes for the debug contract. No React or Three.js imports.
import type { Box } from './collision'

export interface SandboxInfo {
  /** The room's north wall (the one straight ahead of the start position). */
  wall: Box
  /** Z of the inner face of that wall. A walking player stops at this value plus the capsule radius. */
  wallInnerZ: number
  /** The zero-g zone volume. */
  zeroGZone: Box
  /** Timeline time in seconds of the latest test Timeline, or null if none was started. */
  testTimelineTime(): number | null
  /** Whether the sandbox wall light is on. */
  lightOn(): boolean
}

let sandboxInfo: SandboxInfo | null = null

export function setSandboxInfo(info: SandboxInfo | null): void {
  sandboxInfo = info
}

export function getSandboxInfo(): SandboxInfo | null {
  return sandboxInfo
}

let sandboxInstances = 0

/** Called by the sandbox on start (+1) and on unload (-1). */
export function addSandboxInstance(delta: 1 | -1): void {
  sandboxInstances += delta
}

export function getSandboxInstances(): number {
  return sandboxInstances
}

/** Act 4 numbers for `window.__los.act4`. */
export interface Act4Info {
  phase: string
  /** Seconds into the current timeline (descent or liftoff), else 0. */
  time: number
  landerY: number
  carrying: string | null
  done: string[]
  /** True while the flag photo is on screen. */
  photo: boolean
}

let act4Source: (() => Act4Info) | null = null

export function setAct4Source(fn: (() => Act4Info) | null): void {
  act4Source = fn
}

export const getAct4Info = (): Act4Info | null => (act4Source ? act4Source() : null)

/** Act 3 numbers for `window.__los.act3`. */
export interface Act3Info {
  phase: string
  /** Who was carried first: 'cdr', 'cmp' or null. */
  carriedFirst: 'cdr' | 'cmp' | null
  carrying: 'cdr' | 'cmp' | null
  /** Answer the player chose, or null. */
  choice: 'dream' | 'fine' | null
  /** Pick answer 1 or 2 while the choice is open. */
  pick(n: number): boolean
}

let act3Source: (() => Act3Info) | null = null

export function setAct3Source(fn: (() => Act3Info) | null): void {
  act3Source = fn
}

export const getAct3Info = (): Act3Info | null => (act3Source ? act3Source() : null)
