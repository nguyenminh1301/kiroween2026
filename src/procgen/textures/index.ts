import { drawFieldPatch } from './fieldPatch'
import { drawGratingPlate } from './gratingPlate'
import type { PixelData } from './helpers'
import { drawInstrumentPanel } from './instrumentPanel'
import { drawMetalPanel } from './metalPanel'
import { drawPadGrating } from './padGrating'
import { drawPaintedSteel } from './paintedSteel'
import { drawRegolith } from './regolith'
import { drawRocketSkin } from './rocketSkin'
import { drawRust } from './rust'
import { drawWhitePanel } from './whitePanel'
import { drawWhiteRoom } from './whiteRoom'

export type { PixelData }

export const TEXTURE_NAMES = [
  'metalPanel',
  'whitePanel',
  'rust',
  'gratingPlate',
  'instrumentPanel',
  'regolith',
  'padGrating',
  'paintedSteel',
  'whiteRoom',
  'rocketSkin',
  'fieldPatch',
] as const

export type ProcTextureName = (typeof TEXTURE_NAMES)[number]

const DRAWERS: Record<ProcTextureName, (seed: number) => PixelData> = {
  metalPanel: drawMetalPanel,
  whitePanel: drawWhitePanel,
  rust: drawRust,
  gratingPlate: drawGratingPlate,
  instrumentPanel: drawInstrumentPanel,
  regolith: drawRegolith,
  padGrating: drawPadGrating,
  paintedSteel: drawPaintedSteel,
  whiteRoom: drawWhiteRoom,
  rocketSkin: drawRocketSkin,
  fieldPatch: drawFieldPatch,
}

export function drawTexture(name: string, seed: number): PixelData {
  if (!Object.prototype.hasOwnProperty.call(DRAWERS, name)) {
    throw new Error(`Unknown texture name "${name}". Known names: ${TEXTURE_NAMES.join(', ')}`)
  }
  return DRAWERS[name as ProcTextureName](seed)
}
