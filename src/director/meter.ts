// What the noise meter shows. Pure.
import { HUD } from '../content/hud'
import { hearingThreshold } from './hearing'
import type { MonsterMode } from './monster'

/** The bar fill (0 to 1) where the white tick sits is `1 / METER_SCALE`. */
export const METER_SCALE = 1.25
export const RED_FROM = 0.64

/** noise / threshold, so 1 means the creature hears you. */
export const noiseRatio = (noise: number, distance: number): number => noise / hearingThreshold(distance)

export function meterFill(ratio: number): number {
  return Math.min(1, Math.max(0, ratio / METER_SCALE))
}

export const meterRed = (ratio: number): boolean => ratio > RED_FROM

export function meterLabel(mode: MonsterMode, hidden: boolean, holding: boolean): string {
  const m = HUD.meter
  if (mode === 'alert') return m.heard
  if (mode === 'hunt') return hidden ? m.hidden : m.heard
  if (mode === 'search') return m.searching
  if (hidden) return m.hidden
  if (holding) return m.silent
  return m.listening
}
