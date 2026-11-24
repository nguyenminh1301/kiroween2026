import {
  CanvasTexture,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from 'three'
import { cacheKey } from './cacheKey'
import { drawTexture } from './textures'

const cache = new Map<string, Texture>()

function configure(t: Texture): Texture {
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.needsUpdate = true
  return t
}

function build(name: string, seed: number): Texture {
  const pixels = drawTexture(name, seed)
  let ctx: CanvasRenderingContext2D | null = null
  let canvas: HTMLCanvasElement | null = null
  try {
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas')
      canvas.width = pixels.width
      canvas.height = pixels.height
      ctx = canvas.getContext('2d')
    }
  } catch {
    ctx = null
  }
  if (ctx && canvas) {
    const img = ctx.createImageData(pixels.width, pixels.height)
    img.data.set(pixels.data)
    ctx.putImageData(img, 0, 0)
    return configure(new CanvasTexture(canvas))
  }
  const tex = new DataTexture(
    new Uint8Array(pixels.data),
    pixels.width,
    pixels.height,
    RGBAFormat,
    UnsignedByteType,
  )
  return configure(tex)
}

/** Returns the cached texture for (name, seed), drawing it on first use. */
export function getTexture(name: string, seed = 0): Texture {
  const key = cacheKey(name, seed)
  let tex = cache.get(key)
  if (!tex) {
    tex = build(name, seed)
    cache.set(key, tex)
  }
  return tex
}

export function textureCacheSize(): number {
  return cache.size
}

/** For tests: dispose every texture and empty the cache. */
export function disposeAllTextures(): void {
  for (const t of cache.values()) t.dispose()
  cache.clear()
}
