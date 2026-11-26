import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { HUD } from '../content/hud'
import { VERB_LABELS } from '../content/verbs'
import { DREAM_CHOICES, MENUS } from '../content/menus'
import { pickChoice } from '../engine/choiceBridge'
import { METER_TICK } from '../engine/fx'
import { isDebugUrl, lockRuntime, requestLock } from '../engine/inputRuntime'
import { needsLockPrompt } from '../engine/pointerLock'
import { useFx, useGame } from './hooks'
import { nameLine, revealCount } from './dialogue'

/** Centered prompt shown when the game runs without the pointer lock. A click takes it back. */
export function LockPrompt() {
  const screen = useGame((s) => s.screen)
  const paused = useGame((s) => s.paused)
  const locked = useGame((s) => s.pointerLocked)
  const card = useFx((s) => s.card)
  const show = needsLockPrompt({
    screen,
    paused,
    card: card !== null,
    locked,
    everLocked: lockRuntime.everLocked,
    debug: isDebugUrl(),
  })
  if (!show) return null
  return (
    <button type="button" className="lock-prompt" data-lock-prompt onClick={() => requestLock()}>
      {MENUS.clickToContinue}
    </button>
  )
}

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
    <div className={cls.join(' ')} style={{ '--sub-scale': scale } as CSSProperties} data-testid="subtitle">
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

export function NoiseMeterBar() {
  const meter = useFx((s) => s.meter)
  const paused = useGame((s) => s.paused)
  if (!meter || paused) return null
  return (
    <div className="noise-meter" data-testid="noise-meter">
      <div className="noise-title">{HUD.meter.title}</div>
      <div className="noise-bar">
        <div className={`noise-fill${meter.red ? ' red' : ''}`} style={{ width: `${meter.fill * 100}%` }} />
        <div className="noise-tick" style={{ left: `${METER_TICK * 100}%` }} />
      </div>
      <div className="noise-label">{meter.label}</div>
    </div>
  )
}

/** The close-up cabin pressure gauge of act 2. Shows the needle, the green band and the knob. */
export function GaugeDial() {
  const g = useFx((s) => s.gauge)
  if (!g) return null
  const deg = (r: number): number => (r * 180) / Math.PI
  const point = (r: number, rad: number): string =>
    `${100 + Math.sin(rad) * r},${100 - Math.cos(rad) * r}`
  const [a0, a1] = g.bandRad
  const tip = point(70, g.needleRad).split(',')
  return (
    <div className="gauge-close" data-testid="gauge">
      <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={HUD.gauge.title}>
        <circle cx="100" cy="100" r="96" fill="#16181a" />
        <circle cx="100" cy="100" r="88" fill="#e8e3d2" />
        <path d={`M ${point(68, a0)} A 68 68 0 0 1 ${point(68, a1)}`} stroke="#2f9e44" strokeWidth="12" fill="none" />
        <line x1="100" y1="100" x2={tip[0]} y2={tip[1]} stroke="#b3262a" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill="#16181a" />
        <text x="100" y="150" textAnchor="middle" fontSize="12" fill="#16181a">{HUD.gauge.title}</text>
        <text x="100" y="168" textAnchor="middle" fontSize="14" fill="#16181a">{g.needle.toFixed(1)} {HUD.gauge.unit}</text>
      </svg>
      <div className="gauge-knob" style={{ transform: `rotate(${deg(g.knob * 4.7 - 2.35)}deg)` }} aria-hidden="true" />
      <div className="gauge-hold"><div className={g.inBand ? 'on' : ''} style={{ width: `${g.held * 100}%` }} /></div>
    </div>
  )
}

export function FxLayer() {
  const edge = useFx((s) => s.edge)
  const flash = useFx((s) => s.flash)
  const blackout = useFx((s) => s.blackout)
  const flashes = useFx((s) => s.flashes)
  const caption = useFx((s) => s.caption)
  const card = useFx((s) => s.card)
  const dsky = useFx((s) => s.dsky)
  const photo = useFx((s) => s.photo)
  return (
    <>
      {edge > 0 ? <div className="fx-edge" style={{ opacity: edge }} data-testid="edge" /> : null}
      <div className="fx-black" style={{ opacity: blackout }} />
      {flash ? (
        <div className="fx-caught" data-testid="caught">
          <p>{flash}</p>
        </div>
      ) : null}
      {blackout > 0.6
        ? flashes.map((f, i) =>
            f.figure ? (
              <div key={i} className="fx-figure" />
            ) : (
            <div
              key={i}
              className="fx-flash"
              style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${(f.size ?? 0.06) * 100}vh`, height: `${(f.size ?? 0.06) * 100}vh` }}
            />
            ),
          )
        : null}
      <GaugeDial />
      {photo ? (
        <>
          <div className="fx-photo-flash" />
          <figure className="fx-print" data-testid="photo">
            <img src={photo.src} alt={photo.alt} />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        </>
      ) : null}
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

/**
 * The two answers after waking from the act 3 dream, at the bottom of the screen in menu style.
 * Keys 1 and 2 pick. The pointer is locked, so the mouse moves the mark (up and down) and a click picks it.
 */
export function ChoicePrompt() {
  const open = useGame((s) => s.choiceOpen)
  const paused = useGame((s) => s.paused)
  const [mark, setMark] = useState<0 | 1>(0)
  const markRef = useRef<0 | 1>(0)
  markRef.current = mark
  const live = open && !paused
  useEffect(() => {
    if (!live) return
    setMark(0)
    const answers = ['dream', 'fine'] as const
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Digit1' || e.code === 'Numpad1') pickChoice(answers[0])
      else if (e.code === 'Digit2' || e.code === 'Numpad2') pickChoice(answers[1])
    }
    const onMove = (e: MouseEvent): void => {
      if (e.movementY > 3) setMark(1)
      else if (e.movementY < -3) setMark(0)
    }
    const onClick = (): void => void pickChoice(answers[markRef.current])
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [live])
  if (!live) return null
  return (
    <div className="choice-prompt" data-testid="choice-prompt">
      {(['dream', 'fine'] as const).map((k, i) => (
        <button
          key={k}
          type="button"
          className={`btn${mark === i ? ' marked' : ''}`}
          data-choice={k}
          onClick={(e) => {
            e.stopPropagation()
            pickChoice(k)
          }}
        >
          <span className="num">{i + 1}</span>
          {DREAM_CHOICES[k]}
        </button>
      ))}
    </div>
  )
}
