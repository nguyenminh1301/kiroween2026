import { useEffect, useState, useSyncExternalStore } from 'react'
import { MENUS } from '../content/menus'
import { readEnv } from '../app/env'
import { gateReason } from '../app/flow'
import { loader } from '../app/loader'
import { isDebugUrl } from '../engine/inputRuntime'
import { useFx, useGame } from './hooks'
import { Dialogue, Dot, LockPrompt, FxLayer, ChoicePrompt, NoiseMeterBar, TopRight, Wrist } from './Overlays'
import { Begin, MessageScreen, PauseMenu } from './Screens'
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
  const renderFailed = useGame((s) => s.renderFailed)
  const envReason = isDebugUrl() ? null : gateReason(env)
  // A renderer that cannot start only blocks the game itself. Menus work on black.
  const reason = envReason ?? (renderFailed && screen === 'game' ? 'noWebgl' : null)

  let body: React.ReactNode = null
  if (reason) body = <MessageScreen title={MENUS[reason].title} body={MENUS[reason].body} />
  else if (screen === 'gate') body = <MessageScreen title={MENUS.gate.title} body={MENUS.gate.body} />
  else if (screen === 'begin') body = <Begin />
  else if (screen === 'leaving') body = <div className="leaving" data-screen="leaving" />
  else if (screen === 'game') {
    body = (
      <>
        <ChoicePrompt />
        <Dot />
        <TopRight />
        <Wrist />
        <NoiseMeterBar />
        <Dialogue />
        <LockPrompt />
        {status === 'loading' ? <div className="loading-line">{MENUS.loading}</div> : null}
        {paused && !card ? <PauseMenu /> : null}
      </>
    )
  }

  return (
    <div className={`ui-root${reduced ? ' reduced' : ''}`}>
      {screen === 'game' && !reason ? <FxLayer /> : null}
      {body}
    </div>
  )
}
