import { readRaw } from '../engine/persistence'
import { parseSaved } from '../engine/settings'

export type Mark = 'seen' | 'missed'

/** Marks for each moment id, or null when no run was played on this browser. */
export function momentMarks(raw: string | null, ids: readonly string[]): Record<string, Mark> | null {
  const saved = parseSaved(raw)
  if (!saved.played) return null
  const seen = new Set(saved.seen ?? [])
  return Object.fromEntries(ids.map((id) => [id, seen.has(id) ? 'seen' : 'missed'] as const))
}

export const MARK_TEXT: Record<Mark, string> = {
  seen: 'Seen in your flight',
  missed: 'Missed in your flight',
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function checkIcon(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  for (const [k, v] of Object.entries({ width: '12', height: '12', viewBox: '0 0 12 12', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'aria-hidden': 'true' })) svg.setAttribute(k, v)
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', 'M2 6.5l2.5 2.5L10 3.5')
  svg.append(path)
  return svg
}

/** Fill the mark of every moment in the page. Leaves the page unchanged when there is no saved run. */
export function applyMarks(root: ParentNode = document, raw: string | null = readRaw()): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-moment]')]
  const marks = momentMarks(raw, items.map((el) => el.dataset.moment ?? ''))
  if (!marks) return
  let seen = 0
  for (const el of items) {
    const mark = marks[el.dataset.moment ?? '']
    const p = el.querySelector<HTMLElement>('.mark')
    if (!p || !mark) continue
    if (mark === 'seen') seen += 1
    p.replaceChildren(...(mark === 'seen' ? [checkIcon()] : []), MARK_TEXT[mark])
    p.dataset.state = mark
    p.hidden = false
  }
  const count = root.querySelector<HTMLElement>('#marks-count')
  if (count) count.textContent = String(seen)
  const note = root.querySelector<HTMLElement>('#marks-note')
  if (note) note.hidden = false
}
