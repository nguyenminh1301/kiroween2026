import { Color, MeshBasicMaterial, MeshLambertMaterial, type Material } from 'three'
import { getTexture } from '../procgen/textureCache'
import { normalizeMaterialOptions, type MaterialOptions } from './materialOptions'
import { snapPatch } from './snapPatch'

export type { MaterialKind, MaterialOptions } from './materialOptions'

export function createMaterial(opts: MaterialOptions = {}): MeshBasicMaterial | MeshLambertMaterial {
  const o = normalizeMaterialOptions(opts)
  const params = {
    color: new Color(o.color),
    vertexColors: o.vertexColors,
    fog: o.fog,
    map: o.textureName ? getTexture(o.textureName, o.textureSeed) : null,
  }
  const material = o.kind === 'unlit' ? new MeshBasicMaterial(params) : new MeshLambertMaterial(params)
  if (o.snap) snapPatch.apply(material)
  return material
}

export function disposeMaterial(material: Material): void {
  snapPatch.remove(material)
  material.dispose()
}
