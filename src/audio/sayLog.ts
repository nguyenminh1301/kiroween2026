// Collects the lines an event list says, with the time of the event. Pure, for timing tests.
import type { TimelineEvent } from '../timeline/timeline'
import type { SaidLine } from './lineSchedule'

/** Runs every event once with a `say` hook that records `{ at, id, opts }`; the other hooks do nothing. */
export function saidLines<H extends object>(build: (hooks: H) => TimelineEvent[]): SaidLine[] {
  const said: SaidLine[] = []
  let at = 0
  const hooks = new Proxy({} as H, {
    get: (_t, key) => (key === 'say' ? (id: string, opts?: SaidLine['opts']) => said.push({ at, id, opts }) : () => {}),
  })
  for (const e of build(hooks)) {
    at = e.at
    e.run()
  }
  return said
}
