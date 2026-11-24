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
