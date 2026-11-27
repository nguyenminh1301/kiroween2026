// The game window over the article: a framed panel with the game in an iframe.
import { parseHostMessage, type HostMessage } from '../engine/hostBridge'
import { ACT_TITLES } from '../content/menus'
import { WINDOW_TEXT as T } from '../content/window'
import { IDLE_RUN, reduceRun, type RunState } from './runState'
import { BAR_HEIGHT, usesFullPage, windowLayout } from './windowLayout'

export interface GameWindowHooks {
  /** Called whenever the run state changes, and with the idle state when the window closes. */
  onRun: (s: RunState) => void
  /** Called after the window closed because the run ended. */
  onEnd: () => void
}

const SCROLL_LOCK = 'gw-open'
const BACKGROUND = ['header.bar', 'main', 'footer.site-footer']

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}

export function installGameWindow(hooks: GameWindowHooks): { open: () => void; close: () => void; isOpen: () => boolean } {
  let root: HTMLElement | null = null
  let frame: HTMLIFrameElement | null = null
  let stage: HTMLElement | null = null
  let panel: HTMLElement | null = null
  let actLabel: HTMLElement | null = null
  let confirmBox: HTMLElement | null = null
  let opener: HTMLElement | null = null
  let run: RunState = IDLE_RUN

  const setRun = (next: RunState): void => {
    run = next
    hooks.onRun(run)
  }

  function layout(): void {
    if (!panel || !frame) return
    const l = windowLayout(window.innerWidth, window.innerHeight)
    panel.style.width = `${l.panelW}px`
    panel.style.height = `${l.panelH}px`
    frame.style.width = `${l.gameW}px`
    frame.style.height = `${l.gameH}px`
    panel.style.setProperty('--gw-bar', `${BAR_HEIGHT}px`)
  }

  function setBackground(inert: boolean): void {
    for (const sel of BACKGROUND) document.querySelector(sel)?.toggleAttribute('inert', inert)
  }

  function onMessage(e: MessageEvent): void {
    if (!frame || e.origin !== window.location.origin || e.source !== frame.contentWindow) return
    const m: HostMessage | null = parseHostMessage(e.data)
    if (!m) return
    setRun(reduceRun(run, m))
    if (m.type === 'act' && m.act && actLabel) actLabel.textContent = ACT_TITLES[m.act]
    if (m.type === 'leave') shut(false)
    if (m.type === 'end') shut(true)
  }

  function toggleFullscreen(btn: HTMLButtonElement): void {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frame?.requestFullscreen?.().catch(() => {})
    btn.blur()
  }

  function shut(ended: boolean): void {
    if (!root) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    window.removeEventListener('message', onMessage)
    window.removeEventListener('resize', layout)
    // Removing the iframe stops every sound and timer in it.
    root.remove()
    root = frame = stage = panel = actLabel = confirmBox = null
    document.documentElement.classList.remove(SCROLL_LOCK)
    document.documentElement.style.removeProperty('--gw-scrollbar')
    setBackground(false)
    setRun({ ...IDLE_RUN, ended })
    if (ended) hooks.onEnd()
    else opener?.focus()
  }

  function requestClose(): void {
    if (!run.running || !confirmBox) return shut(false)
    confirmBox.hidden = false
    confirmBox.querySelector<HTMLButtonElement>('[data-keep]')?.focus()
  }

  function build(): void {
    root = el('div', 'gw')
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-modal', 'true')
    root.setAttribute('aria-label', T.title)
    panel = el('div', 'gw-panel')
    const bar = el('div', 'gw-bar')
    bar.append(el('span', 'gw-title', T.title))
    actLabel = el('span', 'gw-act', ACT_TITLES['act0-pad'])
    bar.append(actLabel, el('span', 'gw-spacer'))
    const full = el('button', 'gw-btn', T.fullScreen)
    full.type = 'button'
    full.addEventListener('click', () => toggleFullscreen(full))
    const close = el('button', 'gw-btn gw-close', T.close)
    close.type = 'button'
    close.addEventListener('click', requestClose)
    bar.append(full, close)
    stage = el('div', 'gw-stage')
    frame = document.createElement('iframe')
    frame.className = 'gw-frame'
    frame.title = T.frameLabel
    frame.allow = 'fullscreen; autoplay'
    frame.setAttribute('allowfullscreen', '')
    frame.src = `./play.html${window.location.search}`
    stage.append(frame)
    confirmBox = el('div', 'gw-confirm')
    confirmBox.hidden = true
    confirmBox.setAttribute('role', 'alertdialog')
    confirmBox.setAttribute('aria-label', T.confirmTitle)
    const card = el('div', 'gw-confirm-card')
    const keep = el('button', 'gw-btn', T.confirmKeep)
    keep.type = 'button'
    keep.dataset.keep = ''
    keep.addEventListener('click', () => {
      if (confirmBox) confirmBox.hidden = true
      frame?.focus()
    })
    const yes = el('button', 'gw-btn gw-close', T.confirmClose)
    yes.type = 'button'
    yes.addEventListener('click', () => shut(false))
    card.append(el('p', 'gw-confirm-title', T.confirmTitle), el('p', 'gw-confirm-body', T.confirmBody), keep, yes)
    confirmBox.append(card)
    panel.append(bar, stage, confirmBox)
    root.append(panel)
  }

  function open(): void {
    if (root) return
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (usesFullPage(window.innerWidth, window.matchMedia('(pointer: fine)').matches)) {
      const note = el('p', 'gw-note', T.phoneNote)
      note.setAttribute('role', 'status')
      document.body.append(note)
      window.setTimeout(() => window.location.assign(`./play.html${window.location.search}`), 1800)
      return
    }
    build()
    if (!root || !frame) return
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.documentElement.style.setProperty('--gw-scrollbar', `${scrollbar}px`)
    document.documentElement.classList.add(SCROLL_LOCK)
    setBackground(true)
    document.body.append(root)
    layout()
    window.addEventListener('resize', layout)
    window.addEventListener('message', onMessage)
    setRun({ ...IDLE_RUN })
    frame.focus()
  }

  return { open, close: requestClose, isOpen: () => root !== null }
}

/** Wire every `[data-open-game]` link to open the window. The href stays as the fallback. */
export function bindOpeners(open: () => void): void {
  for (const a of document.querySelectorAll<HTMLElement>('[data-open-game]')) {
    a.addEventListener('click', (ev) => {
      if (ev instanceof MouseEvent && (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0)) return
      ev.preventDefault()
      open()
    })
  }
}
