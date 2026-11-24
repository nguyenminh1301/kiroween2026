import { useEffect, useState, useSyncExternalStore } from 'react'
import { MENUS } from '../content/menus'
import { readEnv } from '../app/env'
import { gateReason } from '../app/flow'
import { loader } from '../app/loader'
import { isDebugUrl } from '../engine/inputRuntime'
import { useFx, useGame } from './hooks'
import { Chapters, Credits, Headphones, MessageScreen, PauseMenu, Settings, Title, Warning } from './Screens'
import './ui.css'

function useEnv() {
  const [env, setEnv] = useState(readEnv)
  useEffect(() => {
    const on = () => setEnv(readEnv())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return env
}

/** All DOM UI: blocking messages, menu screens, and the in-game overlays. */
export function UiRoot() {
  const env = useEnv()
  const screen = useGame((s) => s.screen)
  const paused = useGame((s) => s.paused)
  const reduced = useGame((s) => s.settings.reducedMotion)
  const card = useFx((s) => s.card)
  const status = useSyncExternalStore(loader.subscribe, () => loader.getState().status)
  const reason = isDebugUrl() ? null : gateReason(env)

  let body: React.ReactNode = null
  if (reason) body = <MessageScreen title={MENUS[reason].title} body={MENUS[reason].body} />
  else if (screen === 'gate') body = <MessageScreen title={MENUS.gate.title} body={MENUS.gate.body} />
  else if (screen === 'warning') body = <Warning />
  else if (screen === 'headphones') body = <Headphones />
  else if (screen === 'title') body = <Title />
  else if (screen === 'chapters') body = <Chapters />
  else if (screen === 'settings') body = <Settings />
  else if (screen === 'credits') body = <Credits />
  else if (screen === 'game') {
    body = (
      <>
        {status === 'loading' ? <div className="loading-line">{MENUS.loading}</div> : null}
        {paused && !card ? <PauseMenu /> : null}
      </>
    )
  }

  return <div className={`ui-root${reduced ? ' reduced' : ''}`}>{body}</div>
}
