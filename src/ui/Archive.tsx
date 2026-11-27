import { useEffect, useRef } from 'react'
import { MOMENTS, TOLD_MOMENT } from '../content/archive'
import { PHOTO } from '../content/hud'
import { DREAM_CHOICES, FORM_LINE, MENUS } from '../content/menus'
import { goScreen } from '../app/session'
import { useGame } from './hooks'

export function Archive() {
  const seen = useGame((s) => s.anomaliesSeen)
  const told = useGame((s) => s.dreamChoice)
  const m = MENUS.archive
  const back = useRef<HTMLButtonElement>(null)
  useEffect(() => back.current?.focus({ preventScroll: true }), [])
  const count = MOMENTS.filter((a) => seen.includes(a.id)).length
  return (
    <div className="screen" data-screen="archive">
      <div className="paper archive">
        <div className="form-line">{FORM_LINE}</div>
        <h2>{m.title}</h2>
        <p>{m.intro}</p>
        <p data-testid="archive-count">
          {m.noticed}: {count} / {MOMENTS.length}.
        </p>
        {MOMENTS.map((a) => {
          const got = seen.includes(a.id)
          return (
            <div key={a.id} className={`moment ${got ? 'seen' : 'missed'}`} data-moment={a.id}>
              <div className="tag">{got ? m.noticed : m.missed}</div>
              <p className="saw">{a.seen}</p>
              <p className="real">{a.real}</p>
              {a.id === TOLD_MOMENT && told ? (
                <p className="told" data-testid="archive-told">
                  {m.told} {DREAM_CHOICES[told]}
                </p>
              ) : null}
              <p className="cite">
                {m.source}: {a.cite}.{' '}
                <a href={a.source} target="_blank" rel="noreferrer">
                  {a.source}
                </a>
              </p>
            </div>
          )
        })}
        <figure className="archive-photo" data-testid="archive-photo">
          <img src={PHOTO.src} alt={PHOTO.alt} />
          <figcaption>
            {PHOTO.caption}{' '}
            <a href={PHOTO.source} target="_blank" rel="noreferrer">
              {m.source}
            </a>
          </figcaption>
        </figure>
        <button type="button" ref={back} className="btn" onClick={() => goScreen('title')}>
          {m.back}
        </button>
      </div>
    </div>
  )
}
