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

/** Fill the mark line of every moment in the page. Leaves the page unchanged when there is no saved run. */
export function applyMarks(root: ParentNode = document, raw: string | null = readRaw()): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-moment]')]
  const marks = momentMarks(raw, items.map((el) => el.dataset.moment ?? ''))
  if (!marks) return
  for (const el of items) {
    const mark = marks[el.dataset.moment ?? '']
    const p = el.querySelector<HTMLElement>('.mark')
    if (!p || !mark) continue
    p.textContent = MARK_TEXT[mark]
    p.dataset.state = mark
    p.hidden = false
  }
  const note = root.querySelector<HTMLElement>('#marks-note')
  if (note) note.hidden = false
}
