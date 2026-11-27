// Surface task rules for act 4: one carried item, the right item per task, each task once.
// Pure: no Three.js or React imports.
import { ACT4_TEXT } from '../../content/checklists'

export type TaskId = 'flag' | 'sample' | 'seismo'
export type Item = 'flag' | 'scoop' | 'seismo'

export const TASK_IDS: readonly TaskId[] = ['flag', 'sample', 'seismo']
export const ITEM_FOR: Record<TaskId, Item> = { flag: 'flag', sample: 'scoop', seismo: 'seismo' }
export const TASK_FOR: Record<Item, TaskId> = { flag: 'flag', scoop: 'sample', seismo: 'seismo' }

/** Interactable ids. */
export const KIT_ID: Record<Item, string> = {
  flag: 'act4:flagkit',
  scoop: 'act4:scoop',
  seismo: 'act4:seismokit',
}
export const SITE_ID: Record<TaskId, string> = {
  flag: 'act4:spot',
  sample: 'act4:sample',
  seismo: 'act4:seismo',
}

export interface TaskState {
  carrying: Item | null
  done: Record<TaskId, boolean>
  /** The last task finished, set when all three are done. */
  last: TaskId | null
  /** The flag photo: taken once the player stands at the photo spot after planting. */
  photoDone: boolean
}

export const createTasks = (): TaskState => ({
  carrying: null,
  done: { flag: false, sample: false, seismo: false },
  last: null,
  photoDone: false,
})

export const remaining = (s: TaskState): TaskId[] => TASK_IDS.filter((t) => !s.done[t])
export const tasksDone = (s: TaskState): boolean => remaining(s).length === 0
/** Everything done: the three tasks and the flag photo. */
export const allDone = (s: TaskState): boolean => tasksDone(s) && s.photoDone
export const photoPending = (s: TaskState): boolean => s.done.flag && !s.photoDone
export const PHOTO_ID = 'act4:photo'

/** Take the flag photo. Returns null when the flag is not up or the photo is already taken. */
export function takePhoto(s: TaskState): TaskState | null {
  return photoPending(s) ? { ...s, photoDone: true } : null
}

/** The soil sample and the seismometer wait until the flag photo is taken. */
export const isLocked = (s: TaskState, item: Item): boolean => item !== 'flag' && !s.photoDone
export const canTake = (s: TaskState, item: Item): boolean =>
  s.carrying === null && !s.done[TASK_FOR[item]] && !isLocked(s, item)
export const canDo = (s: TaskState, task: TaskId): boolean => s.carrying === ITEM_FOR[task] && !s.done[task]

/** Pick up an item. Returns the new state, or null when the rules refuse. */
export function take(s: TaskState, item: Item): TaskState | null {
  return canTake(s, item) ? { ...s, carrying: item } : null
}

/** Finish a task with the carried item. `finished` is true when this was the third. */
export function doTask(s: TaskState, task: TaskId): { state: TaskState; finished: boolean } | null {
  if (!canDo(s, task)) return null
  const done = { ...s.done, [task]: true }
  const finished = TASK_IDS.every((t) => done[t])
  return { state: { ...s, carrying: null, done, last: finished ? task : s.last }, finished }
}

const LABEL: Record<TaskId, string> = {
  flag: ACT4_TEXT.flag,
  sample: ACT4_TEXT.sample,
  seismo: ACT4_TEXT.seismo,
}
const CARRY_TEXT: Record<Item, string> = {
  flag: ACT4_TEXT.carryFlag,
  scoop: ACT4_TEXT.carryScoop,
  seismo: ACT4_TEXT.carrySeismo,
}

/** Strip text for the current state, or null when nothing is left. */
export function objectiveText(s: TaskState): string | null {
  if (s.carrying) return CARRY_TEXT[s.carrying]
  if (!s.photoDone) return s.done.flag ? ACT4_TEXT.photo : ACT4_TEXT.flagFirst
  const left = remaining(s)
  return left.length ? ACT4_TEXT.prefix + left.map((t) => LABEL[t]).join('. ') : null
}

/** Interactable ids that are enabled now, for the markers. */
export function enabledTargets(s: TaskState): string[] {
  if (s.carrying) return [SITE_ID[TASK_FOR[s.carrying]]]
  if (!s.photoDone) return s.done.flag ? [PHOTO_ID] : [KIT_ID.flag]
  return remaining(s).map((t) => KIT_ID[ITEM_FOR[t]])
}
