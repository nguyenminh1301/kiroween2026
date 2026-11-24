import { drawGratingPlate } from './gratingPlate'
import type { PixelData } from './helpers'
import { drawInstrumentPanel } from './instrumentPanel'
import { drawMetalPanel } from './metalPanel'
import { drawRegolith } from './regolith'
import { drawRust } from './rust'
import { drawWhitePanel } from './whitePanel'

export type { PixelData }

export const TEXTURE_NAMES = [
  'metalPanel',
  'whitePanel',
  'rust',
  'gratingPlate',
  'instrumentPanel',
  'regolith',
] as const

export type ProcTextureName = (typeof TEXTURE_NAMES)[number]

const DRAWERS: Record<ProcTextureName, (seed: number) => PixelData> = {
  metalPanel: drawMetalPanel,
  whitePanel: drawWhitePanel,
  rust: drawRust,
  gratingPlate: drawGratingPlate,
  instrumentPanel: drawInstrumentPanel,
  regolith: drawRegolith,
}

export function drawTexture(name: string, seed: number): PixelData {
  if (!Object.prototype.hasOwnProperty.call(DRAWERS, name)) {
    throw new Error(`Unknown texture name "${name}". Known names: ${TEXTURE_NAMES.join(', ')}`)
  }
  return DRAWERS[name as ProcTextureName](seed)
}
