import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PRINT_PHOTOS, PRINT_SCHEDULE } from './prints'

const photos = JSON.parse(readFileSync('public/img/article/photos.json', 'utf8')) as Record<
  string,
  { nasa_id: string; date: string }
>

describe('print schedule', () => {
  const entries = Object.entries(PRINT_SCHEDULE).flatMap(([act, ids]) => (ids ?? []).map((id) => ({ act, id })))

  it('points every moment to a known photo that exists in photos.json and on disk', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const { act, id } of entries) {
      const p = PRINT_PHOTOS[id]
      expect(p, `${act} ${id}`).toBeDefined()
      expect(photos[p.file], `${p.file} in photos.json`).toBeDefined()
      expect(photos[p.file].nasa_id.toLowerCase(), p.file).toBe(p.number.toLowerCase())
      expect(p.file.startsWith(p.number.toLowerCase()), p.file).toBe(true)
      expect(existsSync(`public/img/article/${p.file}`), `${p.file} on disk`).toBe(true)
    }
  })

  it('shows each of the twelve photos once, in the act and order of the story', () => {
    expect(PRINT_SCHEDULE).toEqual({
      'act1-launch': ['liftoff', 'earth'],
      'act2-coast': ['broadcast'],
      'act3-farside': ['earthrise'],
      'act4-moon': ['eagleInside', 'control', 'commander', 'rendezvous'],
      'act5-home': ['raft', 'lifted', 'quarantineWalk', 'quarantineTrailer'],
    })
    const files = entries.map((e) => PRINT_PHOTOS[e.id].file)
    expect(new Set(files).size).toBe(12)
    expect(files).toEqual([
      's69-39961.jpg',
      'as11-36-5355.jpg',
      's69-39532.jpg',
      'as11-44-6552.jpg',
      'as11-36-5390.jpg',
      's69-39815.jpg',
      'as11-37-5528.jpg',
      'as11-44-6642.jpg',
      's69-21698.jpg',
      's69-21294.jpg',
      's69-40753.jpg',
      'ksc-69pc-484.jpg',
    ])
  })

  it('has short captions with a date and no real astronaut names', () => {
    for (const p of Object.values(PRINT_PHOTOS)) {
      expect(p.what.length).toBeLessThanOrEqual(90)
      expect(p.what).toMatch(/1969/)
      expect(p.what).not.toMatch(/Armstrong|Aldrin|Collins|Buzz|Neil|Mike|Michael|Edwin/)
      expect(p.what).not.toMatch(new RegExp('[\\u2013\\u2014]| -' + '- '))
    }
  })
})
