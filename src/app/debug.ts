export const DEBUG_VERSION = '0.1.0'

export interface LosDebug {
  version: string
}

export function isDebug(search: string): boolean {
  return new URLSearchParams(search).has('debug')
}

/** Sets window.__los when the URL has ?debug. Later specs add fields. Never rename it. */
export function installDebug(win: Window = window): void {
  if (isDebug(win.location.search)) {
    win.__los = { version: DEBUG_VERSION }
  }
}
