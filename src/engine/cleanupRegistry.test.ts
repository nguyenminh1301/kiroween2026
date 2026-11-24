import { afterEach, describe, expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { createCleanupRegistry } from './cleanupRegistry'

describe('cleanupRegistry', () => {
  afterEach(() => vi.restoreAllMocks())

  // Feature: engine-core, Property 49: Cleanup runs exactly once, in reverse order, tolerating throws
  it('runs each cleanup once, newest first, even when some throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 20 }), (throws) => {
        const reg = createCleanupRegistry()
        const calls: number[] = []
        throws.forEach((t, i) =>
          reg.register(() => {
            calls.push(i)
            if (t) throw new Error('boom')
          }),
        )
        expect(() => reg.runAll()).not.toThrow()
        expect(calls).toEqual(throws.map((_, i) => i).reverse())
        reg.runAll()
        expect(calls).toHaveLength(throws.length)
      }),
      { numRuns: 100 },
    )
  })
})
