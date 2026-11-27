// Messages between the game (in an iframe) and the article page. Pure: no game, React or Three imports.
import type { ActId } from '../types'

export const HOST_SOURCE = 'los'

export type HostMessage =
  | { source: typeof HOST_SOURCE; type: 'act'; act: ActId | null }
  /** The act 3 dream starts (true) or Buzz wakes (false). */
  | { source: typeof HOST_SOURCE; type: 'dream'; on: boolean }
  | { source: typeof HOST_SOURCE; type: 'hunt'; on: boolean }
  /** The player chose "Back to the article". */
  | { source: typeof HOST_SOURCE; type: 'leave' }
  /** The run is over. */
  | { source: typeof HOST_SOURCE; type: 'end' }

const ACTS: readonly string[] = ['act0-pad', 'act1-launch', 'act2-coast', 'act3-farside', 'act4-moon', 'act5-home']

export const hostMessage = {
  act: (act: ActId | null): HostMessage => ({ source: HOST_SOURCE, type: 'act', act }),
  dream: (on: boolean): HostMessage => ({ source: HOST_SOURCE, type: 'dream', on }),
  hunt: (on: boolean): HostMessage => ({ source: HOST_SOURCE, type: 'hunt', on }),
  leave: (): HostMessage => ({ source: HOST_SOURCE, type: 'leave' }),
  end: (): HostMessage => ({ source: HOST_SOURCE, type: 'end' }),
}

/** Returns the message, or null for anything that is not one of ours. */
export function parseHostMessage(data: unknown): HostMessage | null {
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  if (d.source !== HOST_SOURCE) return null
  switch (d.type) {
    case 'act':
      if (d.act === null) return hostMessage.act(null)
      return typeof d.act === 'string' && ACTS.includes(d.act) ? hostMessage.act(d.act as ActId) : null
    case 'dream':
      return typeof d.on === 'boolean' ? hostMessage.dream(d.on) : null
    case 'hunt':
      return typeof d.on === 'boolean' ? hostMessage.hunt(d.on) : null
    case 'leave':
      return hostMessage.leave()
    case 'end':
      return hostMessage.end()
    default:
      return null
  }
}

/** True when this page runs inside another page. */
export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window
  } catch {
    return true
  }
}

/** Send to the article page. Does nothing when the game runs on its own. */
export function postToHost(msg: HostMessage): void {
  if (!isEmbedded()) return
  try {
    window.parent.postMessage(msg, window.location.origin)
  } catch {
    /* the parent is gone */
  }
}
