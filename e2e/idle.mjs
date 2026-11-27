// A newcomer who does nothing. In each act that waits for the player: load it, do nothing for 60 s,
// then check the objective and a hint are on screen, nothing is stuck and the screen is not black.
// In act 3 the creature keeps patrolling and does not catch a player standing still at the start.
import { gameUrl } from './url.mjs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = gameUrl()
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots')
mkdirSync(shotDir, { recursive: true })

const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}

/** [act, checkpoint]. Act 1 is run to the red switch, act 4 to the surface tasks. */
const CASES = [
  ['act0-pad', undefined],
  ['act1-launch', undefined],
  ['act2-coast', undefined],
  ['act3-farside', 'start'],
  ['act4-moon', 'tasks'],
]
const IDLE_MS = 60000

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 })

  /** Mean brightness 0 to 255 of a screenshot, decoded in the page. */
  const brightness = async () => {
    const png = await page.screenshot()
    return page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 40, img.width, img.height - 40)
      let sum = 0
      for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3
      return sum / (data.length / 4)
    }, png.toString('base64'))
  }

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  for (const [id, cp] of CASES) {
    await page.evaluate(([id, cp]) => window.__los.loader.loadAct(id, cp), [id, cp])
    await wait((id) => window.__los.loader.state.getState().act === id && window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, id, 60000)
    await wait(() => !document.querySelector('[data-testid=card]'), null, 60000)
    const g0 = await page.evaluate(() => window.__los.gameTime())
    const startPos = await page.evaluate(() => ({ ...window.__los.player.body.pos }))
    // Do nothing. The 60 s of game time are counted from the load, not the wall clock.
    await wait((t) => window.__los.gameTime() > t + 60, g0, 20 * 60000)
    if (id === 'act3-farside') {
      // The creature must still be patrolling, and must not have caught a player who stands still.
      const d1 = await page.evaluate(() => JSON.parse(JSON.stringify(window.__los.director)))
      check(d1.state.phase !== 'caught', `act 3 idle: phase ${d1.state.phase}, expected not caught`)
      check(['patrol', 'peek', 'search', 'alert', 'hunt'].includes(d1.monster.mode), `act 3 idle: creature mode ${d1.monster.mode}`)
      const p1 = d1.monster.pos
      await wait((p) => {
        const m = window.__los.director.monster.pos
        return Math.hypot(m.x - p.x, m.z - p.z) > 0.5
      }, p1, 60000)
      check(true, 'creature still moves')
    }
    // The idle hint waits for a quiet line and an objective that is 45 s old.
    await wait(() => !!document.querySelector('[data-testid=hint]'), null, 4 * 60000).catch(() => {})
    const st = await page.evaluate(() => {
      const s = window.__los.store.getState()
      return {
        objective: s.objective?.text ?? null,
        focus: window.__los.focus(),
        paused: s.paused,
        screen: s.screen,
        hint: document.querySelector('[data-testid=hint]')?.textContent ?? null,
        objectiveDom: !!document.querySelector('[data-testid=objective]'),
        caught: !!document.querySelector('[data-testid=caught]'),
        pos: { ...window.__los.player.body.pos },
      }
    })
    check(st.objective !== null && st.objectiveDom, `${id}: no objective on screen after ${IDLE_MS / 1000} s`)
    check(st.hint !== null, `${id}: no hint on screen after ${IDLE_MS / 1000} s`)
    check(st.focus === false, `${id}: focus stuck on`)
    check(st.paused === false && st.screen === 'game', `${id}: paused ${st.paused} on screen ${st.screen}`)
    check(!st.caught, `${id}: caught while standing still`)
    const bright = await brightness()
    check(bright > 3, `${id}: screen is black (mean ${bright.toFixed(2)})`)
    // Standing still means the player did not drift away (zero-g acts have no drift without a push).
    check(Math.hypot(st.pos.x - startPos.x, st.pos.z - startPos.z) < 3, `${id}: player moved by itself, ${JSON.stringify(startPos)} to ${JSON.stringify(st.pos)}`)
    await page.screenshot({ path: join(shotDir, `idle-${id}.png`) })
    console.log(`${id}: objective "${st.objective}", hint "${st.hint}", brightness ${bright.toFixed(1)}`)
  }
} catch (e) {
  errors.push(`script: ${e.message.split('\n')[0]} at ${(e.stack.match(/idle.mjs:(\d+)/g) ?? []).join(' ')}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'idle-fail.png') })
  } catch {
    /* no page */
  }
} finally {
  await browser.close()
}

if (errors.length) {
  console.log(errors.join('\n'))
  process.exit(1)
}
console.log('errors: none')
