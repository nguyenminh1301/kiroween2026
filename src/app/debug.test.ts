import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { installDebug, isDebug, type LosDebug } from './debug'

describe('isDebug', () => {
  it.each([
    ['?debug', true],
    ['?debug=1', true],
    ['?a=1&debug', true],
    ['?a=1&debug=true&b=2', true],
    ['debug', true],
    ['', false],
    ['?', false],
    ['?debugger', false],
    ['?a=debug', false],
    ['?nodebug=1', false],
  ])('%j -> %s', (search, expected) => {
    expect(isDebug(search)).toBe(expected)
  })

  it('is false when no key is named debug', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1 }).filter((k) => k !== 'debug'),
            fc.string(),
          ),
        ),
        (pairs) => {
          const search = '?' + new URLSearchParams(pairs).toString()
          expect(isDebug(search)).toBe(false)
        },
      ),
    )
  })

  it('is true when a key named debug is added', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(isDebug('?' + new URLSearchParams({ debug: value }).toString())).toBe(true)
      }),
    )
  })
})

describe('installDebug render contract', () => {
  const fakeWin = (search: string) => ({ location: { search } }) as unknown as Window

  it('does not define window.__los without ?debug', () => {
    const w = fakeWin('')
    installDebug(w)
    expect((w as unknown as { __los?: unknown }).__los).toBeUndefined()
  })

  it('exposes stats and render without renaming existing fields', () => {
    const w = fakeWin('?debug')
    installDebug(w)
    const los = (w as unknown as { __los: LosDebug }).__los
    for (const k of ['version', 'store', 'loader', 'player', 'focus', 'lock', 'sandbox', 'systemCount']) {
      expect(los).toHaveProperty(k)
    }
    expect(Object.keys(los.stats).sort()).toEqual(
      ['calls', 'frameMs', 'internalHeight', 'internalWidth', 'level', 'triangles'].sort(),
    )
    expect(los.stats.level).toBe(1)
    los.render.setLevel(3)
    expect(los.stats.level).toBe(3)
    los.render.setLevel(7)
    los.render.setLevel(1.5)
    expect(los.stats.level).toBe(3)
    los.render.setLevel(1)
    expect(typeof los.render.auto).toBe('function')
  })
})
