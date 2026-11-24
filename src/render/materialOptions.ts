export type TextureName =
  | 'metalPanel'
  | 'whitePanel'
  | 'rust'
  | 'gratingPlate'
  | 'instrumentPanel'
  | 'regolith'
  | 'padGrating'
  | 'paintedSteel'
  | 'whiteRoom'
  | 'rocketSkin'
  | 'fieldPatch'

export type MaterialKind = 'unlit' | 'lambert'

export interface MaterialOptions {
  kind?: MaterialKind
  color?: string | number
  textureName?: TextureName
  textureSeed?: number
  vertexColors?: boolean
  snap?: boolean
  fog?: boolean
}

export interface NormalizedMaterialOptions {
  kind: MaterialKind
  color: string | number
  textureName?: TextureName
  textureSeed: number
  vertexColors: boolean
  snap: boolean
  fog: boolean
}

export function normalizeMaterialOptions(opts: MaterialOptions = {}): NormalizedMaterialOptions {
  const out: NormalizedMaterialOptions = {
    kind: opts.kind === 'unlit' ? 'unlit' : 'lambert',
    color: opts.color ?? '#ffffff',
    textureSeed:
      typeof opts.textureSeed === 'number' && Number.isFinite(opts.textureSeed) ? opts.textureSeed : 0,
    vertexColors: opts.vertexColors ?? false,
    snap: opts.snap ?? true,
    fog: opts.fog ?? true,
  }
  if (opts.textureName !== undefined) out.textureName = opts.textureName
  return out
}
