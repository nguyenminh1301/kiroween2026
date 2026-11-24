import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importAct = vi.hoisted(() => vi.fn())
vi.mock('../acts/registry', () => ({ importAct }))

import { cleanupRegistry } from '../engine/cleanupRegistry'
import { gameStore } from '../engine/store'
import { boot } from './boot'
import { DEBUG_VERSION, installDebug } from './debug'
import { loader } from './loader'

const g = globalThis as unknown as { window?: Record<string, unknown> }

function setUrl(search: string): Record<string, unknown> {
  const win: Record<string, unknown> = { location: { search }, addEventListener() {}, removeEventListener() {} }
  g.window = win
  return win
}

describe('bootstrap and debug gating', () => {
  beforeEach(() => {
    importAct.mockReset()
  })
  afterEach(() => {
    cleanupRegistry.runAll()
    delete g.window
  })

  it('without ?debug: no window.__los, no act loaded, no import', () => {
    const win = setUrl('')
    boot()
    expect(win.__los).toBeUndefined()
    expect(loader.getState()).toEqual({ status: 'idle', act: null, checkpoint: null })
    expect(importAct).not.toHaveBeenCalled()
  })

  it('without ?debug: installDebug leaves window alone', () => {
    const win = setUrl('?a=1')
    installDebug(win as unknown as Window)
    expect('__los' in win).toBe(false)
  })

  it('without ?debug: loadAct("sandbox") is refused with status error and no import', async () => {
    setUrl('')
    await loader.loadAct('sandbox')
    expect(loader.getState().status).toBe('error')
    expect(importAct).not.toHaveBeenCalled()
  })

  it('with ?debug: exposes the contract with version and null body before load', async () => {
    const win = setUrl('?debug')
    importAct.mockResolvedValue({ id: 'sandbox', checkpoints: ['start'], Scene: () => null, start() {} })
    boot()
    const los = win.__los as {
      version: string
      store: unknown
      loader: { state: { getState(): unknown }; loadAct: unknown }
      player: { body: unknown; set: unknown; launch: unknown }
      focus: () => boolean
      lock: { markHeld: unknown }
    }
    expect(los.version).toBe(DEBUG_VERSION)
    expect(los.store).toBe(gameStore)
    expect(typeof los.loader.loadAct).toBe('function')
    expect(typeof los.player.set).toBe('function')
    expect(typeof los.player.launch).toBe('function')
    expect(los.player.body).toBeNull()
    expect(los.focus()).toBe(false)
    expect(typeof los.lock.markHeld).toBe('function')
    expect(importAct).toHaveBeenCalledWith('sandbox')
    expect(los.loader.state.getState()).toMatchObject({ status: 'loading', act: null })
    await vi.waitFor(() => expect(loader.getState().status).toBe('ready'))
    expect(los.player.body).toBeNull()
  })

  it('with ?debug: loads the sandbox, then player.body is populated', async () => {
    const win = setUrl('?debug')
    const real = await vi.importActual<typeof import('../acts/registry')>('../acts/registry')
    importAct.mockImplementation((id: string) => real.importAct(id))
    boot()
    await vi.waitFor(() => expect(loader.getState().status).toBe('ready'))
    const los = win.__los as { player: { body: { pos: unknown; vel: unknown; yaw: number; pitch: number; mode: string } | null } }
    const body = los.player.body
    expect(body).not.toBeNull()
    expect(body).toHaveProperty('pos')
    expect(body).toHaveProperty('vel')
    expect(body).toHaveProperty('yaw')
    expect(body).toHaveProperty('pitch')
    expect(body!.mode).toBe('walk')
    expect(loader.getState().act).toBe('sandbox')
  })
})
