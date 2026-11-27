import { useState } from 'react'
import { audio } from '../audio'
import { ACT_TITLES, FORM_LINE, MENUS } from '../content/menus'
import { ACT_ORDER } from '../engine/actOrder'
import { resumeGame } from '../engine/inputRuntime'
import { SETTINGS_RANGES } from '../engine/settings'
import { gameStore } from '../engine/store'
import { leaveToArticle, pickChapter, restartCheckpoint, startRun } from '../app/session'
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

/** The only card before the game. Browsers need one click before they allow sound and mouse lock. */
export function Begin() {
  return (
    <div className="screen" data-screen="begin">
      <button
        type="button"
        className="typed-panel begin-card"
        autoFocus
        onClick={() => {
          audio.unlock()
          void startRun()
        }}
      >
        <p>{MENUS.begin}</p>
      </button>
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
      <label className="setting-row">
        <span>{m.prints}</span>
        <input
          type="checkbox"
          name="prints"
          checked={settings.prints}
          onChange={(e) => set({ prints: e.target.checked })}
        />
      </label>
      <Btn onClick={onBack}>{backLabel}</Btn>
    </>
  )
}

export function PauseMenu() {
  const [view, setView] = useState<'menu' | 'chapters' | 'settings'>('menu')
  const m = MENUS.pause
  if (view === 'chapters') {
    return (
      <div className="screen dim" data-screen="pause">
        <div className="paper">
          <div className="form-line">{FORM_LINE}</div>
          <h2>{MENUS.chapters.title}</h2>
          <div className="menu-list">
            {ACT_ORDER.map((id, i) => (
              <Btn key={id} first={i === 0} onClick={() => void pickChapter(id)}>
                <span className="num">{String(i).padStart(2, '0')}</span>
                {ACT_TITLES[id]}
              </Btn>
            ))}
            <Btn onClick={() => setView('menu')}>{MENUS.chapters.back}</Btn>
          </div>
        </div>
      </div>
    )
  }
  if (view === 'settings') {
    return (
      <div className="screen dim" data-screen="pause">
        <div className="paper">
          <div className="form-line">{FORM_LINE}</div>
          <h2>{MENUS.settings.title}</h2>
          <SettingsForm onBack={() => setView('menu')} />
        </div>
      </div>
    )
  }
  return (
    <div className="screen dim" data-screen="pause">
      <div className="typed-panel">
        <h2>{m.title}</h2>
        <div className="menu-list">
          <Btn first onClick={() => resumeGame()}>
            {m.resume}
          </Btn>
          <Btn onClick={() => void restartCheckpoint()}>{m.restart}</Btn>
          <Btn onClick={() => setView('chapters')}>{m.chapters}</Btn>
          <Btn onClick={() => setView('settings')}>{m.settings}</Btn>
          <Btn onClick={() => leaveToArticle()}>{m.back}</Btn>
        </div>
      </div>
    </div>
  )
}
