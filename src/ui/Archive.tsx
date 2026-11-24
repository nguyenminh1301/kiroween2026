import { useEffect, useRef } from 'react'
import { ANOMALIES } from '../content/anomalies'
import { FORM_LINE, MENUS } from '../content/menus'
import { goScreen } from '../app/session'
import { useGame } from './hooks'

export function Archive() {
  const seen = useGame((s) => s.anomaliesSeen)
  const m = MENUS.archive
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => back.current?.focus({ preventScroll: true }), [])
  const count = ANOMALIES.filter((a) => seen.includes(a.id)).length
  return (
    <div className="screen" data-screen="archive">
      <div className="paper archive">
        <div className="form-line">{FORM_LINE}</div>
        <h2>{m.title}</h2>
        <p>{m.intro}</p>
        <p data-testid="archive-count">
          {m.noticed}: {count} / {ANOMALIES.length}.
        </p>
        {ANOMALIES.map((a) => {
          const got = seen.includes(a.id)
          return (
            <div key={a.id} className={`anomaly ${got ? 'noticed' : 'missed'}`} data-anomaly={a.id}>
              <div className="tag">{got ? m.noticed : m.missed}</div>
              <p className="seen">{a.seen}</p>
              <p className="real">{a.real}</p>
              <a href={a.source} target="_blank" rel="noreferrer">
                {m.source}
              </a>
            </div>
          )
        })}
        <button type="button" ref={back} className="btn" onClick={() => goScreen('title')}>
          {m.back}
        </button>
      </div>
    </div>
  )
}
