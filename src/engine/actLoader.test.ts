import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { createActLoader, resolveCheckpoint, type Act_Module, type LoadableId } from './actLoader'
import { createCleanupRegistry } from './cleanupRegistry'
import { gameStore } from './store'

const ACT_IDS: LoadableId[] = ['act0-pad', 'act1-launch', 'act2-coast', 'act3-farside', 'act4-moon', 'act5-home', 'sandbox']
const idArb = fc.constantFrom(...ACT_IDS)
const cpListArb = fc.uniqueArray(fc.stringMatching(/^[a-z0-9]{1,6}$/), { minLength: 1, maxLength: 6 })

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function resetStore(): void {
  gameStore.getState().setAct(null)
  gameStore.getState().setCheckpoint(null)
}

describe('actLoader', () => {
  beforeEach(resetStore)
  afterEach(() => vi.restoreAllMocks())

  // Feature: engine-core, Property 46: Checkpoint resolution
  it('resolveCheckpoint returns the request when listed, else the first entry', () => {
    fc.assert(
      fc.property(cpListArb, fc.option(fc.string(), { nil: undefined }), fc.nat(), fc.boolean(), (list, any, i, pickValid) => {
        const requested = pickValid ? list[i % list.length] : any
        const got = resolveCheckpoint(list, requested)
        if (requested !== undefined && list.includes(requested)) expect(got).toBe(requested)
        else expect(got).toBe(list[0])
      }),
      { numRuns: 100 },
    )
  })

  // Feature: engine-core, Property 47: Act load lifecycle and store writes
  it('goes loading then ready, writes the store, and calls start once with the resolved checkpoint', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, cpListArb, fc.option(fc.string(), { nil: undefined }), async (id, cps, requested) => {
        resetStore()
        const start = vi.fn()
        const mod: Act_Module = { id, checkpoints: cps, Scene: () => null, start }
        const loader = createActLoader({
          importAct: async () => mod,
          cleanupRegistry: createCleanupRegistry(),
          store: gameStore,
          allowed: () => true,
          onUnload: () => {},
        })
        const seen: string[] = []
        loader.subscribe(() => seen.push(loader.getState().status))
        await loader.loadAct(id, requested)
        const expected = resolveCheckpoint(cps, requested)
        expect(seen).toEqual(['loading', 'ready'])
        expect(loader.getState()).toEqual({ status: 'ready', act: id, checkpoint: expected })
        expect(start).toHaveBeenCalledTimes(1)
        expect(start).toHaveBeenCalledWith(expected)
        expect(gameStore.getState().checkpoint).toBe(expected)
        if (id !== 'sandbox') expect(gameStore.getState().act).toBe(id)
      }),
      { numRuns: 100 },
    )
  })

  it('sets error and starts nothing when the import fails or the id is not allowed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const start = vi.fn()
    const mod: Act_Module = { id: 'act0-pad', checkpoints: ['start'], Scene: () => null, start }
    const failing = createActLoader({
      importAct: () => Promise.reject(new Error('x')),
      cleanupRegistry: createCleanupRegistry(),
      store: gameStore,
      allowed: () => true,
      onUnload: () => {},
    })
    await failing.loadAct('act0-pad')
    expect(failing.getState().status).toBe('error')
    expect(failing.getModule()).toBeNull()
    const refused = createActLoader({
      importAct: async () => mod,
      cleanupRegistry: createCleanupRegistry(),
      store: gameStore,
      allowed: () => false,
      onUnload: () => {},
    })
    await refused.loadAct('act0-pad')
    expect(refused.getState().status).toBe('error')
    expect(start).not.toHaveBeenCalled()
  })

  // Feature: engine-core, Property 48: Overlapping loadAct calls, only the last wins
  it('keeps at most one act active and the last call wins under any import timing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const callArb = fc.record({
      id: idArb,
      cp: fc.option(fc.constantFrom('start', 'wp1', 'bogus'), { nil: undefined }),
      reject: fc.boolean(),
      resolveAfter: fc.nat(3),
    })
    await fc.assert(
      fc.asyncProperty(
        fc.array(callArb, { minLength: 1, maxLength: 8 }),
        fc.array(fc.nat(), { minLength: 8, maxLength: 8 }),
        async (calls, picks) => {
          resetStore()
          const registry = createCleanupRegistry()
          const pending = new Map<number, { resolve: () => void; reject: () => void }>()
          let issued = 0
          let active = 0
          let maxActive = 0
          const started: { call: number; issuedAtStart: number }[] = []
          const importAct = (id: LoadableId): Promise<Act_Module> => {
            const call = issued - 1
            return new Promise((resolve, reject) => {
              pending.set(call, {
                resolve: () =>
                  resolve({
                    id,
                    checkpoints: ['start', 'wp1'],
                    Scene: () => null,
                    start: () => {
                      started.push({ call, issuedAtStart: issued })
                      active++
                      maxActive = Math.max(maxActive, active)
                      registry.register(() => active--)
                    },
                  }),
                reject: () => reject(new Error('import failed')),
              })
            })
          }
          const loader = createActLoader({
            importAct,
            cleanupRegistry: registry,
            store: gameStore,
            allowed: () => true,
            onUnload: () => {},
          })
          const lastIndex = calls.length - 1
          const settle = async (call: number): Promise<void> => {
            const p = pending.get(call)
            if (!p) return
            pending.delete(call)
            if (calls[call].reject && call !== lastIndex) p.reject()
            else p.resolve()
            await flush()
            expect(active).toBeLessThanOrEqual(1)
          }
          let pi = 0
          const promises: Promise<void>[] = []
          for (let i = 0; i < calls.length; i++) {
            issued++
            promises.push(loader.loadAct(calls[i].id, calls[i].cp))
            expect(active).toBeLessThanOrEqual(1)
            for (let k = 0; k < calls[i].resolveAfter && pending.size > 0; k++) {
              const keys = [...pending.keys()]
              await settle(keys[picks[pi++ % picks.length] % keys.length])
            }
          }
          while (pending.size > 0) {
            const keys = [...pending.keys()]
            await settle(keys[picks[pi++ % picks.length] % keys.length])
          }
          await Promise.all(promises)

          const last = calls[lastIndex]
          const expectedCp = resolveCheckpoint(['start', 'wp1'], last.cp)
          expect(loader.getState()).toEqual({ status: 'ready', act: last.id, checkpoint: expectedCp })
          expect(maxActive).toBeLessThanOrEqual(1)
          expect(active).toBe(1)
          // A start only ever runs for a call that was still the latest one.
          for (const s of started) expect(s.issuedAtStart).toBe(s.call + 1)
          expect(started[started.length - 1].call).toBe(lastIndex)
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: engine-core, Property 52: Sequential loadAct ordering
  it('runs every cleanup of the previous act before the new start', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(idArb, { minLength: 2, maxLength: 6 }), fc.nat(5), async (ids, cleanupCount) => {
        resetStore()
        const registry = createCleanupRegistry()
        const log: string[] = []
        const loader = createActLoader({
          importAct: async (id) => ({
            id,
            checkpoints: ['start'],
            Scene: () => null,
            start: () => {
              log.push('start')
              for (let i = 0; i < cleanupCount; i++) registry.register(() => log.push('cleanup'))
            },
          }),
          cleanupRegistry: registry,
          store: gameStore,
          allowed: () => true,
          onUnload: () => log.push('reset'),
        })
        for (const id of ids) await loader.loadAct(id)
        // Before each start after the first, all previous cleanups have run.
        let live = 0
        let starts = 0
        for (const entry of log) {
          if (entry === 'start') {
            expect(live).toBe(0)
            starts++
            live = cleanupCount
          } else if (entry === 'cleanup') live--
        }
        expect(starts).toBe(ids.length)
      }),
      { numRuns: 100 },
    )
  })
})
