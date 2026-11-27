import { describe, expect, it } from 'vitest'
import { assetUrl } from './assetUrl'

describe('assetUrl', () => {
  it('keeps relative paths relative under a ./ base', () => {
    expect(assetUrl('audio/zipper.mp3', './')).toBe('./audio/zipper.mp3')
    expect(assetUrl('/audio/zipper.mp3', './')).toBe('./audio/zipper.mp3')
  })
  it('works under the root base and a named sub-path', () => {
    expect(assetUrl('audio/zipper.mp3', '/')).toBe('/audio/zipper.mp3')
    expect(assetUrl('audio/zipper.mp3', '/game')).toBe('/game/audio/zipper.mp3')
  })
})
