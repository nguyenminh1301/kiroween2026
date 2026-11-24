import { useState } from 'react'
import { audio } from '../audio'
import { ACT_TITLES, FORM_LINE, MENUS } from '../content/menus'
import { ACT_ORDER } from '../engine/actOrder'
import { resumeGame } from '../engine/inputRuntime'
import { SETTINGS_RANGES } from '../engine/settings'
import { gameStore, type Screen } from '../engine/store'
import { titleButtons } from '../app/flow'
import { goScreen, pickChapter, quitToTitle, restartCheckpoint, startRun } from '../app/session'
import { useGame } from './hooks'

function Btn({ children, onClick, first }: { children: React.ReactNode; onClick: () => void; first?: boolean }) {
  return (
    <button type="button" className="btn" autoFocus={first} onClick={onClick}>
      {children}
    </button>
  )
}

export function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="screen" data-screen="message">
      <div className="typed-panel">
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  )
}

export function Warning() {
  const m = MENUS.warning
  return (
    <div className="screen" data-screen="warning">
      <div className="typed-panel">
        <h2>{m.title}</h2>
        <p>{m.body}</p>
        <Btn first onClick={() => goScreen('headphones')}>
          {m.action}
        </Btn>
      </div>
    </div>
  )
}

export function Headphones() {
  const m = MENUS.headphones
  return (
    <div className="screen" data-screen="headphones">
      <div className="typed-panel">
        <h2>{m.title}</h2>
        <p>{m.body}</p>
        <Btn
          first
          onClick={() => {
            audio.unlock()
            goScreen('title')
          }}
        >
          {m.action}
        </Btn>
      </div>
    </div>
  )
}

/** A wavy carrier trace that ends in a flat line. */
function tracePath(): string {
  const pts: string[] = []
  for (let x = 0; x <= 340; x += 4) {
    const live = x < 220
    const amp = live ? 12 * Math.sin(x * 0.11) * Math.sin(x * 0.037 + 1) + 5 * Math.sin(x * 0.45) : 0
    pts.push(`${x === 0 ? 'M' : 'L'}${x} ${18 + amp}`)
  }
  return pts.join(' ')
}

export function Title() {
  const finished = useGame((s) => s.finished)
  const m = MENUS.title
  const label = (id: string): string =>
    id === 'archive' ? MENUS.archive.menu : (m as unknown as Record<string, string>)[id]
  return (
    <div className="screen" data-screen="title">
      <h1 className="title-name">{m.name}</h1>
      <svg className="title-trace" viewBox="0 0 340 36" aria-hidden="true">
        <path d={tracePath()} />
      </svg>
      <p className="title-tag">{m.tagline}</p>
      <div className="menu-list">
        {titleButtons(finished).map((b, i) => (
          <Btn
            key={b.id}
            first={i === 0}
            onClick={() => (b.screen ? goScreen(b.screen) : void startRun())}
          >
            {label(b.id)}
          </Btn>
        ))}
      </div>
    </div>
  )
}

export function Chapters() {
  const m = MENUS.chapters
  return (
    <div className="screen" data-screen="chapters">
      <div className="paper">
        <div className="form-line">{FORM_LINE}</div>
        <h2>{m.title}</h2>
        <div className="menu-list">
          {ACT_ORDER.map((id, i) => (
            <Btn key={id} first={i === 0} onClick={() => void pickChapter(id)}>
              <span className="num">{String(i).padStart(2, '0')}</span>
              {ACT_TITLES[id]}
            </Btn>
          ))}
          <Btn onClick={() => goScreen('title')}>{m.back}</Btn>
        </div>
      </div>
    </div>
  )
}

const SIZES = [0.8, 1, 1.2, 1.4, 1.6]

export function SettingsForm({ onBack, backLabel = MENUS.settings.back }: { onBack: () => void; backLabel?: string }) {
  const settings = useGame((s) => s.settings)
  const m = MENUS.settings
  const set = gameStore.getState().setSettings
  const [sLo, sHi] = SETTINGS_RANGES.sensitivity
  const [vLo, vHi] = SETTINGS_RANGES.volume
  return (
    <>
      <label className="setting-row">
        <span>{m.sensitivity}</span>
        <input
          type="range"
          name="sensitivity"
          min={sLo}
          max={sHi}
          step={0.1}
          value={settings.sensitivity}
          autoFocus
          onChange={(e) => set({ sensitivity: Number(e.target.value) })}
        />
        <span className="val">{settings.sensitivity.toFixed(1)}</span>
      </label>
      <label className="setting-row">
        <span>{m.volume}</span>
        <input
          type="range"
          name="volume"
          min={vLo}
          max={vHi}
          step={0.05}
          value={settings.volume}
          onChange={(e) => set({ volume: Number(e.target.value) })}
        />
        <span className="val">{Math.round(settings.volume * 100)}</span>
      </label>
      <label className="setting-row">
        <span>{m.subtitleSize}</span>
        <select
          name="subtitleScale"
          value={settings.subtitleScale}
          onChange={(e) => set({ subtitleScale: Number(e.target.value) })}
        >
          {SIZES.map((v) => (
            <option key={v} value={v}>
              {Math.round(v * 100)}%
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        <span>{m.reducedMotion}</span>
        <input
          type="checkbox"
          name="reducedMotion"
          checked={settings.reducedMotion}
          onChange={(e) => set({ reducedMotion: e.target.checked })}
        />
      </label>
      <Btn onClick={onBack}>{backLabel}</Btn>
    </>
  )
}

export function Settings() {
  return (
    <div className="screen" data-screen="settings">
      <div className="paper">
        <div className="form-line">{FORM_LINE}</div>
        <h2>{MENUS.settings.title}</h2>
        <SettingsForm onBack={() => goScreen('title')} />
      </div>
    </div>
  )
}

export function Credits() {
  const m = MENUS.credits
  return (
    <div className="screen" data-screen="credits">
      <div className="paper">
        <div className="form-line">{FORM_LINE}</div>
        <h2>{m.title}</h2>
        {m.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
        <Btn first onClick={() => goScreen('title')}>
          {m.back}
        </Btn>
      </div>
    </div>
  )
}

export function PauseMenu() {
  const [view, setView] = useState<'menu' | 'settings'>('menu')
  const m = MENUS.pause
  return (
    <div className="screen dim" data-screen="pause">
      {view === 'menu' ? (
        <div className="typed-panel">
          <h2>{m.title}</h2>
          <div className="menu-list">
            <Btn first onClick={() => resumeGame()}>
              {m.resume}
            </Btn>
            <Btn onClick={() => void restartCheckpoint()}>{m.restart}</Btn>
            <Btn onClick={() => setView('settings')}>{m.settings}</Btn>
            <Btn onClick={() => quitToTitle()}>{m.quit}</Btn>
          </div>
        </div>
      ) : (
        <div className="paper">
          <div className="form-line">{FORM_LINE}</div>
          <h2>{MENUS.settings.title}</h2>
          <SettingsForm onBack={() => setView('menu')} />
        </div>
      )}
    </div>
  )
}

export type { Screen }
