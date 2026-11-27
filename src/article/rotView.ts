// Writes the decay of the article onto the page. Only the game window starts it.
import { glitchDelay, rotTarget, smearScale, stepRot } from './rot'
import type { RunState } from './runState'

const SVG_NS = 'http://www.w3.org/2000/svg'
const GLITCH_SELECTOR = 'main p, main h2, main h3, main figcaption, .brand-name, .sections a'

export interface RotView {
  update(s: RunState): void
}

export function installRot(): RotView {
  const root = document.documentElement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let level = 0
  let target = 0
  let hunting = false
  let raf = 0
  let last = 0
  let nextGlitch = 0
  let seed = 1
  let seedAt = 0
  let layer: HTMLElement | null = null
  let displace: SVGElement | null = null
  let turbulence: SVGElement | null = null

  function ensureParts(): void {
    if (layer) return
    layer = document.createElement('div')
    layer.className = 'rot-layer'
    layer.setAttribute('aria-hidden', 'true')
    layer.innerHTML = '<div class="rot-stain"></div><div class="rot-cracks"></div>'
    document.body.append(layer)
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.innerHTML =
      '<filter id="rot-smear" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.015 0.35" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>'
    document.body.append(svg)
    turbulence = svg.querySelector('feTurbulence')
    displace = svg.querySelector('feDisplacementMap')
  }

  function glitch(): void {
    const items = [...document.querySelectorAll<HTMLElement>(GLITCH_SELECTOR)].filter((e) => {
      const r = e.getBoundingClientRect()
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0
    })
    const pick = items[Math.floor(Math.random() * items.length)]
    if (!pick) return
    pick.classList.add('rot-glitch')
    window.setTimeout(() => pick.classList.remove('rot-glitch'), 90 + Math.random() * 120)
  }

  function apply(): void {
    const on = level > 0.001
    root.classList.toggle('rot', on)
    root.classList.toggle('rot-hunt', on && hunting)
    if (on) {
      root.style.setProperty('--rot', level.toFixed(3))
      displace?.setAttribute('scale', String(smearScale(level)))
    } else {
      root.style.removeProperty('--rot')
      for (const e of document.querySelectorAll('.rot-glitch')) e.classList.remove('rot-glitch')
    }
  }

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    level = stepRot(level, target, dt)
    if (!reduced.matches) {
      if (level > 0.05 && now >= nextGlitch) {
        glitch()
        nextGlitch = now + glitchDelay(level, Math.random()) * 1000
      }
      if (hunting && now - seedAt > 140) {
        seedAt = now
        seed = (seed % 40) + 1
        turbulence?.setAttribute('seed', String(seed))
      }
    }
    apply()
    raf = level === target && level === 0 ? 0 : requestAnimationFrame(frame)
  }

  return {
    update(s) {
      target = rotTarget(s)
      hunting = s.dreaming && s.hunting
      if (target > 0) ensureParts()
      if (!raf && (target > 0 || level > 0)) {
        last = performance.now()
        nextGlitch = last + 2000
        raf = requestAnimationFrame(frame)
      }
    },
  }
}
