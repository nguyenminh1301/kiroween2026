import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  ITEM_FOR,
  TASK_IDS,
  allDone,
  tasksDone,
  photoPending,
  takePhoto,
  canDo,
  canTake,
  isLocked,
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
  ['sample', 'seismo'],
  ['seismo', 'sample'],
]

/** The flag is planted and the photo taken. */
const afterPhoto = (): TaskState => takePhoto(doTask(take(createTasks(), 'flag')!, 'flag')!.state)!

describe('task rules', () => {
  it('carries one item at a time', () => {
    const s = take(afterPhoto(), 'scoop')!
    expect(take(s, 'seismo')).toBeNull()
    expect(canTake(s, 'flag')).toBe(false)
  })

  it('locks the sample and the seismometer until the photo is taken', () => {
    const s = createTasks()
    expect(isLocked(s, 'scoop')).toBe(true)
    expect(take(s, 'scoop')).toBeNull()
    expect(take(s, 'seismo')).toBeNull()
    const planted = doTask(take(s, 'flag')!, 'flag')!.state
    expect(take(planted, 'scoop')).toBeNull()
    expect(take(takePhoto(planted)!, 'scoop')).not.toBeNull()
  })

  it('needs the right item and refuses a second time', () => {
    const s = take(afterPhoto(), 'scoop')!
    expect(doTask(s, 'flag')).toBeNull()
    expect(doTask(afterPhoto(), 'sample')).toBeNull()
    const r = doTask(s, 'sample')!
    expect(r.state.carrying).toBeNull()
    expect(canTake(r.state, 'scoop')).toBe(false)
    expect(take(r.state, 'scoop')).toBeNull()
  })

  it('finishes after the third task in either order, and only then', () => {
    fc.assert(
      fc.property(fc.constantFrom(...orders), (order) => {
        let s = afterPhoto()
        expect(tasksDone(s)).toBe(false)
        order.forEach((task, i) => {
          s = take(s, ITEM_FOR[task])!
          const r = doTask(s, task)!
          expect(r.finished).toBe(i === 1)
          s = r.state
        })
        expect(tasksDone(s)).toBe(true)
        expect(allDone(s)).toBe(true)
        expect(s.last).toBe(order[1])
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
  it('asks for the flag first, then the photo, then lists what is left', () => {
    const s = createTasks()
    expect(objectiveText(s)).toBe('Plant the flag. The photo comes next')
    expect(enabledTargets(s)).toEqual(['act4:flagkit'])
    const planted = doTask(take(s, 'flag')!, 'flag')!.state
    expect(photoPending(planted)).toBe(true)
    expect(objectiveText(planted)).toBe('Stand in the mark, look at the flag and press E for the photo')
    expect(enabledTargets(planted)).toEqual(['act4:photo'])
    const posed = takePhoto(planted)!
    expect(objectiveText(posed)).toBe('Surface tasks, any order: Scoop a soil sample. Set up the seismometer')
    expect(enabledTargets(posed)).toEqual(['act4:scoop', 'act4:seismokit'])
  })

  it('shows the carried item text and its marker', () => {
    expect(objectiveText(take(createTasks(), 'flag')!)).toBe('Carry the flag to its marker and plant it')
    expect(objectiveText(take(afterPhoto(), 'scoop')!)).toBe('Take the scoop to the sample marker')
    const s = take(afterPhoto(), 'seismo')!
    expect(objectiveText(s)).toBe('Carry the seismometer to its marker')
    expect(enabledTargets(s)).toEqual(['act4:seismo'])
  })

  it('takes the photo once, and the strip is empty when all is done', () => {
    let s = createTasks()
    expect(takePhoto(s)).toBeNull()
    s = afterPhoto()
    expect(takePhoto(s)).toBeNull()
    for (const t of ['sample', 'seismo'] as const) s = doTask(take(s, ITEM_FOR[t])!, t)!.state
    expect(allDone(s)).toBe(true)
    expect(objectiveText(s)).toBeNull()
  })
})
