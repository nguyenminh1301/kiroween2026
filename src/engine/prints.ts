// Small prints of real NASA photos in the top right corner. The act calls `showPrint(act, id)`; the print slides
// in, stays PRINT_SECONDS of game time, slides out. It never takes input and never pauses the game.
import { assetUrl } from '../audio/assetUrl'
import { PRINT_LINE2, PRINT_PHOTOS, PRINT_SCHEDULE } from '../content/prints'
import type { ActId } from '../types'
import { fxStore } from './fx'
import { gameStore } from './store'
import { addTimeout } from './registerHelpers'

/** Seconds the print stays after it has slid in. */
export const PRINT_SECONDS = 8
/** Seconds of the slide out. */
export const PRINT_SLIDE_OUT = 0.6
/** Public path of the photos. */
export const PRINT_DIR = 'img/article/'

export interface PrintHideState {
  gauge: boolean
  photo: boolean
  bite: boolean
  card: boolean
  choice: boolean
  tension: string
}

/** True while a close-up, the photo print, the swallow, a card, the dream answer or the act 3 chase is on screen. */
export function printHidden(s: PrintHideState): boolean {
  return s.gauge || s.photo || s.bite || s.card || s.choice || s.tension === 'CHASE'
}

/** Photos of an act that come after `id`, for loading ahead. */
export function nextPrintId(act: ActId, id: string): string | null {
  const list = PRINT_SCHEDULE[act] ?? []
  const i = list.indexOf(id)
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null
}

const loaded = new Map<string, HTMLImageElement>()
const url = (file: string): string => assetUrl(`${PRINT_DIR}${file}`)

const printsOn = (): boolean => gameStore.getState().settings.prints

/** Start fetching a photo so it is ready when its moment comes. Does nothing when prints are off. */
export function preloadPrint(id: string): void {
  const p = PRINT_PHOTOS[id]
  if (!p || !printsOn() || typeof Image === 'undefined' || loaded.has(p.file)) return
  const img = new Image()
  img.decoding = 'async'
  img.src = url(p.file)
  loaded.set(p.file, img)
}

/** Load the first print of an act when the act starts. */
export function preloadFirstPrint(act: ActId): void {
  const first = PRINT_SCHEDULE[act]?.[0]
  if (first) preloadPrint(first)
}

let counter = 0

/** Slide a print in now, slide it out after PRINT_SECONDS of game time, and start loading the next photo. */
export function showPrint(act: ActId, id: string): void {
  const p = PRINT_PHOTOS[id]
  if (!p || !printsOn()) return
  preloadPrint(id)
  const fx = fxStore.getState()
  const key = ++counter
  fx.setPrint({ key, src: url(p.file), line1: p.what, line2: `${PRINT_LINE2} ${p.number}`, leaving: false })
  const next = nextPrintId(act, id)
  if (next) preloadPrint(next)
  addTimeout(() => {
    const cur = fxStore.getState().print
    if (cur?.key !== key) return
    fxStore.getState().setPrint({ ...cur, leaving: true })
    addTimeout(() => {
      if (fxStore.getState().print?.key === key) fxStore.getState().setPrint(null)
    }, PRINT_SLIDE_OUT)
  }, PRINT_SECONDS)
}
