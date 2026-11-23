import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isDebug } from './debug'

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
