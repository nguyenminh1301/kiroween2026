import { MeshBasicMaterial, MeshLambertMaterial, NearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { cacheKey } from '../procgen/cacheKey'
import { disposeAllTextures, getTexture, textureCacheSize } from '../procgen/textureCache'
import { createMaterial, disposeMaterial } from './materialFactory'
import { SNAP_GLSL, snapPatch } from './snapPatch'

afterEach(() => disposeAllTextures())

describe('texture cache', () => {
  it('returns the same object for the same pair and separate ones otherwise', () => {
    const a = getTexture('rust', 1)
    expect(getTexture('rust', 1)).toBe(a)
    expect(getTexture('rust', 2)).not.toBe(a)
    expect(textureCacheSize()).toBe(2)
  })
  it('falls back to a data texture with no canvas and empties on dispose', () => {
    const t = getTexture('regolith', 0)
    expect(t.constructor.name).toBe('DataTexture')
    disposeAllTextures()
    expect(textureCacheSize()).toBe(0)
  })
  it('has distinct keys for distinct pairs', () => {
    expect(cacheKey('a', 1)).not.toBe(cacheKey('a', 2))
    expect(cacheKey('a', 1)).not.toBe(cacheKey('b', 1))
    expect(cacheKey('a|1', 2)).not.toBe(cacheKey('a', 12))
  })
})

describe('snap patch', () => {
  it('injects divide, snap and multiply, and tracks patched materials', () => {
    expect(SNAP_GLSL).toContain('gl_Position.xy / gl_Position.w')
    expect(SNAP_GLSL).toContain('floor(')
    expect(SNAP_GLSL).toContain('* gl_Position.w')
    const before = snapPatch.patchedCount()
    const m = createMaterial({})
    expect(snapPatch.patchedCount()).toBe(before + 1)
    const key1 = m.customProgramCacheKey()
    snapPatch.setResolution(320, 180)
    expect(m.customProgramCacheKey()).not.toBe(key1)
    snapPatch.setResolution(640, 360)
    disposeMaterial(m)
    expect(snapPatch.patchedCount()).toBe(before)
  })
})

describe('material factory', () => {
  it('creates only the two classes, with defaults and texture wiring', () => {
    const lam = createMaterial({ textureName: 'rust', textureSeed: 3 })
    expect(lam).toBeInstanceOf(MeshLambertMaterial)
    expect(lam.fog).toBe(true)
    expect(lam.map?.magFilter).toBe(NearestFilter)
    expect(lam.map?.minFilter).toBe(NearestFilter)
    expect(lam.map?.generateMipmaps).toBe(false)
    expect(lam.map?.wrapS).toBe(RepeatWrapping)
    expect(lam.map?.colorSpace).toBe(SRGBColorSpace)
    const un = createMaterial({ kind: 'unlit', fog: false, vertexColors: true, snap: false })
    expect(un).toBeInstanceOf(MeshBasicMaterial)
    expect(un.fog).toBe(false)
    expect(un.vertexColors).toBe(true)
    const again = createMaterial({ textureName: 'rust', textureSeed: 3 })
    expect(again).not.toBe(lam)
    expect(again.map).toBe(lam.map)
    ;[lam, un, again].forEach(disposeMaterial)
  })
})
