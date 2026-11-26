// Small canvas textures for the act 5 sets: ribbed panels, parachute checks and stencil text.
// 256 px at most, nearest filtered like the rest of the game.
import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

function make(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const t = new CanvasTexture(canvas)
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

/** Silver panels with vertical ribs and seams. */
export function ribbedPanelTexture(): Texture {
  return make(128, 64, (c) => {
    c.fillStyle = '#b9b6ac'
    c.fillRect(0, 0, 128, 64)
    for (let x = 0; x < 128; x += 8) {
      c.fillStyle = x % 16 === 0 ? '#d6d3c8' : '#8f8c82'
      c.fillRect(x, 0, 3, 64)
    }
    c.fillStyle = '#5e5b52'
    c.fillRect(0, 30, 128, 2)
    c.fillRect(0, 0, 128, 1)
  })
}

/** Orange and white checks: 12 columns (the gores) by 8 rows. */
export function canopyTexture(): Texture {
  return make(96, 64, (c) => {
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 8; j++) {
        c.fillStyle = (i + j) % 2 === 0 ? '#e2561f' : '#f1ece0'
        c.fillRect(i * 8, j * 8, 8, 8)
      }
  })
}

/** Bold black text on a clear background, for the helicopter's number and name. */
export function markTexture(text: string, color = '#101214'): Texture {
  return make(128, 64, (c) => {
    c.clearRect(0, 0, 128, 64)
    c.fillStyle = color
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = `bold ${text.length > 3 ? 40 : 66}px sans-serif`
    c.fillText(text, 64, 35)
  })
}
