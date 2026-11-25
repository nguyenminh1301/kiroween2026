// The DSKY face as a 128x160 canvas texture. Redrawn only when the state changes.
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'
import type { DskyState } from './dsky'

export const DSKY_W = 128
export const DSKY_H = 160

const GREEN = '#5df06a'
const DIM = '#1a2a1c'

/** Draw the face. `ctx` is any 2D context, so the drawing is easy to reuse. */
export function drawDsky(ctx: CanvasRenderingContext2D, s: DskyState): void {
  ctx.fillStyle = '#6d6a5e'
  ctx.fillRect(0, 0, DSKY_W, DSKY_H)
  ctx.fillStyle = '#3c3a32'
  ctx.fillRect(0, 0, DSKY_W, 3)
  ctx.fillRect(0, DSKY_H - 3, DSKY_W, 3)

  // Status lamps, left column.
  ctx.font = 'bold 8px monospace'
  ctx.textBaseline = 'middle'
  const lamps: [string, boolean, string][] = [
    ['COMP ACTY', s.lamps.compActy, '#9be08a'],
    ['KEY REL', s.lamps.keyRel, '#f4f4ea'],
    ['PROG', s.lamps.progAlarm, '#f0a020'],
    ['OPR ERR', false, '#f0a020'],
    ['TEMP', false, '#f0a020'],
    ['RESTART', false, '#f0a020'],
  ]
  lamps.forEach(([label, on, color], i) => {
    const y = 10 + i * 24
    ctx.fillStyle = on ? color : '#2b2a24'
    ctx.fillRect(3, y, 34, 20)
    ctx.fillStyle = on ? '#14120e' : '#8a8676'
    ctx.fillText(label.length > 5 ? label.split(' ')[0] : label, 5, y + 7)
    if (label.includes(' ')) ctx.fillText(label.split(' ')[1], 5, y + 15)
  })

  // Display window.
  ctx.fillStyle = '#050805'
  ctx.fillRect(42, 6, 82, 148)
  ctx.font = 'bold 7px monospace'
  ctx.fillStyle = '#8a9a8a'
  ctx.fillText('PROG', 92, 13)
  ctx.fillText('VERB', 48, 40)
  ctx.fillText('NOUN', 92, 40)
  const digits = (text: string, x: number, y: number, n: number): void => {
    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = DIM
    ctx.fillText('8'.repeat(n), x, y)
    ctx.fillStyle = GREEN
    ctx.fillText(text.padStart(n, ' '), x, y)
  }
  digits(s.prog, 92, 27, 2)
  digits(s.verb, 48, 54, 2)
  digits(s.noun, 92, 54, 2)
  for (const [i, r] of [s.r1, s.r2, s.r3].entries()) {
    const y = 80 + i * 26
    ctx.fillStyle = '#2f3a30'
    ctx.fillRect(46, y + 12, 74, 1)
    digits(r, 46, y, 6)
  }
}

export interface DskyTexture {
  texture: CanvasTexture
  redraw(s: DskyState): void
  dispose(): void
}

export function createDskyTexture(initial: DskyState): DskyTexture {
  const canvas = document.createElement('canvas')
  canvas.width = DSKY_W
  canvas.height = DSKY_H
  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = SRGBColorSpace
  const redraw = (s: DskyState): void => {
    if (ctx) drawDsky(ctx, s)
    texture.needsUpdate = true
  }
  redraw(initial)
  return { texture, redraw, dispose: () => texture.dispose() }
}
