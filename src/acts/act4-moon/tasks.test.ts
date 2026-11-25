import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  ITEM_FOR,
  TASK_IDS,
  allDone,
  canDo,
  canTake,
  createTasks,
  doTask,
  enabledTargets,
  objectiveText,
  take,
  type Item,
  type TaskId,
  type TaskState,
} from './tasks'

const orders: TaskId[][] = [
  ['flag', 'sample', 'seismo'],
  ['flag', 'seismo', 'sample'],
  ['sample', 'flag', 'seismo'],
  ['sample', 'seismo', 'flag'],
  ['seismo', 'flag', 'sample'],
  ['seismo', 'sample', 'flag'],
]

describe('task rules', () => {
  it('carries one item at a time', () => {
    const s = take(createTasks(), 'flag')!
    expect(take(s, 'scoop')).toBeNull()
    expect(canTake(s, 'seismo')).toBe(false)
  })

  it('needs the right item and refuses a second time', () => {
    const s = take(createTasks(), 'scoop')!
    expect(doTask(s, 'flag')).toBeNull()
    expect(doTask(createTasks(), 'sample')).toBeNull()
    const r = doTask(s, 'sample')!
    expect(r.state.carrying).toBeNull()
    expect(canTake(r.state, 'scoop')).toBe(false)
    expect(take(r.state, 'scoop')).toBeNull()
  })

  it('emerges after the third task in any of the 6 orders, and only then', () => {
    fc.assert(
      fc.property(fc.constantFrom(...orders), (order) => {
        let s = createTasks()
        order.forEach((task, i) => {
          s = take(s, ITEM_FOR[task])!
          const r = doTask(s, task)!
          expect(r.emerge).toBe(i === 2)
          s = r.state
        })
        expect(allDone(s)).toBe(true)
        expect(s.last).toBe(order[2])
      }),
    )
  })

  it('never carries two items or repeats a task under random actions', () => {
    const action = fc.oneof(
      fc.constantFrom<Item>('flag', 'scoop', 'seismo').map((i) => ({ kind: 'take' as const, i })),
      fc.constantFrom(...TASK_IDS).map((t) => ({ kind: 'do' as const, t })),
    )
    fc.assert(
      fc.property(fc.array(action, { maxLength: 40 }), (acts) => {
        let s: TaskState = createTasks()
        let doneCount = 0
        for (const a of acts) {
          if (a.kind === 'take') s = take(s, a.i) ?? s
          else {
            const r = doTask(s, a.t)
            if (r) {
              s = r.state
              doneCount++
            }
          }
          expect(doneCount).toBe(TASK_IDS.filter((t) => s.done[t]).length)
        }
        expect(canDo(s, 'flag') && s.done.flag).toBe(false)
      }),
    )
  })
})

describe('objective text', () => {
  it('lists the tasks left', () => {
    const s = createTasks()
    expect(objectiveText(s)).toBe(
      'Surface tasks, any order: Plant the flag. Scoop a soil sample. Set up the seismometer',
    )
    const one = doTask(take(s, 'flag')!, 'flag')!.state
    expect(objectiveText(one)).toBe('Surface tasks, any order: Scoop a soil sample. Set up the seismometer')
    expect(enabledTargets(one)).toEqual(['act4:scoop', 'act4:seismokit'])
  })

  it('shows the carried item text and its marker', () => {
    expect(objectiveText(take(createTasks(), 'flag')!)).toBe('Carry the flag to its marker and plant it')
    expect(objectiveText(take(createTasks(), 'scoop')!)).toBe('Take the scoop to the sample marker')
    const s = take(createTasks(), 'seismo')!
    expect(objectiveText(s)).toBe('Carry the seismometer to its marker')
    expect(enabledTargets(s)).toEqual(['act4:seismo'])
  })

  it('is null when all are done', () => {
    let s = createTasks()
    for (const t of TASK_IDS) s = doTask(take(s, ITEM_FOR[t])!, t)!.state
    expect(objectiveText(s)).toBeNull()
  })
})
