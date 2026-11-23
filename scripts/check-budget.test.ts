import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LIMITS, checkBudget } from './check-budget.mjs'

const dist = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/budget/${name}`, import.meta.url))

// Fixture sizes: entry 100 bytes, vendor 200, lazy 150 (500 in dynamic-over), extra 1000 in total-over.
const small = { entry: 1000, dynamic: 400, total: 5000 }

describe('checkBudget', () => {
  it('uses 5 MB, 4 MB and 25 MB by default', () => {
    expect(DEFAULT_LIMITS).toEqual({ entry: 5 * 1048576, dynamic: 4 * 1048576, total: 25 * 1048576 })
    expect(checkBudget(dist('pass')).failures).toEqual([])
  })

  it('passes under budget and reports each size', () => {
    const r = checkBudget(dist('pass'), small)
    expect(r.failures).toEqual([])
    expect(r.entry?.size).toBe(300)
    expect(r.dynamic).toEqual([{ name: 'assets/lazy.js', size: 150 }])
    expect(r.total).toBeGreaterThan(450)
  })

  it('fails when the entry and its static imports are too big', () => {
    const r = checkBudget(dist('entry-over'), { ...small, entry: 250 })
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]).toContain('entry chunk')
  })

  it('fails when a dynamic chunk is too big', () => {
    const r = checkBudget(dist('dynamic-over'), small)
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]).toContain('assets/lazy.js')
  })

  it('fails when dist is too big', () => {
    const r = checkBudget(dist('total-over'), { ...small, total: 1200 })
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0]).toContain('dist is')
  })

  it('fails when the manifest is missing', () => {
    const r = checkBudget(dist('no-manifest'), small)
    expect(r.failures[0]).toContain('manifest not found')
  })
})
