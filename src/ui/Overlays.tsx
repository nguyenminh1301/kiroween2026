import { useEffect, useState } from 'react'
import { HUD } from '../content/hud'
import { VERB_LABELS } from '../content/verbs'
import { useFx, useGame } from './hooks'
import { nameLine, revealCount } from './dialogue'

export function Dot() {
  const target = useGame((s) => s.target)
  const paused = useGame((s) => s.paused)
  const t = paused ? null : target
  const ring = t?.verb === 'PULL'
  return (
    <div className="dot-root" data-testid="dot">
      <div className={`dot${ring ? ' ring' : ''}`} />
      {t && !ring ? (
        <div className="dot-verb">
          <span className="keycap">E</span>
          <span>{VERB_LABELS[t.verb]}</span>
        </div>
      ) : null}
    </div>
  )
}

export function Dialogue() {
  const sub = useGame((s) => s.subtitle)
  const scale = useGame((s) => s.settings.subtitleScale)
  const [elapsed, setElapsed] = useState(0)
  const key = sub?.key
  useEffect(() => {
    setElapsed(0)
    if (key === undefined) return
    const t0 = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - t0) / 1000), 33)
    return () => clearInterval(id)
  }, [key])
  if (!sub) return null
  const line = nameLine(sub.speaker, sub.mood)
  const n = revealCount(elapsed, sub.text.length)
  const cls = ['dialogue']
  if (!line) cls.push('narrator')
  if (sub.mood === 'shout') cls.push('shout')
  return (
    <div className={cls.join(' ')} style={{ fontSize: 20 * scale }} data-testid="subtitle">
      {line ? (
        <div className="dlg-name" style={sub.speaker === 'UNKNOWN' ? { color: '#ff6a55' } : undefined}>
          {line.name}
          {line.tags.length ? <span className="dlg-tags">{line.tags.join(' ')}</span> : null}
        </div>
      ) : null}
      <div className="dlg-text">
        <span>{sub.text.slice(0, n)}</span>
        <span className="rest">{sub.text.slice(n)}</span>
      </div>
    </div>
  )
}

export function TopRight() {
  const objective = useGame((s) => s.objective)
  const hint = useFx((s) => s.hint)
  return (
    <div className="top-right">
      {objective ? (
        <div className="objective" key={objective.text} data-testid="objective">
          <span className="check" />
          <span className="obj-text">{objective.text}</span>
          {objective.keys ? <span className="stamp-key">{objective.keys}</span> : null}
        </div>
      ) : null}
      {hint ? (
        <div className="hint-slip" key={hint.id} data-testid="hint">
          <span className="stamp-key">{hint.key}</span>
          <span>{hint.text}</span>
        </div>
      ) : null}
    </div>
  )
}

export function Wrist() {
  const on = useFx((s) => s.wrist)
  const paused = useGame((s) => s.paused)
  const hr = useGame((s) => s.heartRate)
  if (!on || paused) return null
  return (
    <div className="wrist" data-testid="wrist">
      <div>
        {HUD.wrist.hr} {Math.round(hr)}
      </div>
      <div>{HUD.wrist.o2}</div>
    </div>
  )
}

export function FxLayer() {
  const blackout = useFx((s) => s.blackout)
  const flashes = useFx((s) => s.flashes)
  const caption = useFx((s) => s.caption)
  const card = useFx((s) => s.card)
  const dsky = useFx((s) => s.dsky)
  return (
    <>
      <div className="fx-black" style={{ opacity: blackout }} />
      {blackout > 0.6
        ? flashes.map((f, i) => (
            <div
              key={i}
              className="fx-flash"
              style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${(f.size ?? 0.06) * 100}vh`, height: `${(f.size ?? 0.06) * 100}vh` }}
            />
          ))
        : null}
      {caption ? <div className="fx-caption">{caption}</div> : null}
      {dsky ? (
        <div className="fx-dsky" data-testid="dsky">
          <div>
            {HUD.dsky.prog} {String(dsky.prog).padStart(2, '0')}
          </div>
          <div>
            {HUD.dsky.verb} {String(dsky.verb).padStart(2, '0')}
          </div>
          <div>
            {HUD.dsky.noun} {String(dsky.noun).padStart(2, '0')}
          </div>
          {dsky.alarm !== null ? (
            <div className="alarm">
              {HUD.alarm} {String(dsky.alarm).padStart(4, '0')}
            </div>
          ) : null}
        </div>
      ) : null}
      {card ? (
        <div className="fx-card" data-testid="card">
          {card.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      ) : null}
    </>
  )
}
