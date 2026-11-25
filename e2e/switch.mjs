// Switching acts and pausing anywhere. Loads every act through the Chapters screen, then a shuffled
// order. After each load: only that act's sounds play, the frame system count matches the first
// load of that act, no errors. In the first pass each act is also paused for 3 s and resumed.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots')
mkdirSync(shotDir, { recursive: true })

const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}

const ACTS = ['act0-pad', 'act1-launch', 'act2-coast', 'act3-farside', 'act4-moon', 'act5-home']
const LOOPS = ['ocean_loop', 'helicopter_loop', 'pad_wind_loop', 'chase_loop', 'drone_loop']
/** Looping sounds that belong to another act and must never play in this one. */
const ALLOWED_LOOPS = {
  'act0-pad': ['pad_wind_loop'],
  'act1-launch': [],
  'act2-coast': [],
  'act3-farside': ['chase_loop', 'drone_loop'],
  'act4-moon': ['chase_loop', 'drone_loop'],
  'act5-home': ['ocean_loop', 'helicopter_loop'],
}

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
  const shot = (name) => page.screenshot({ path: join(shotDir, `${name}.png`) })

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)
  await page.mouse.click(640, 360)
  await wait(() => window.__los.audio.loaded().length >= 40, null, 40000).catch(() => {})

  const counts = {}
  let titleBase = null

  /** Load act `i` by clicking its button on the Chapters screen, and wait until it runs. */
  const load = async (i) => {
    const id = ACTS[i]
    await page.evaluate(() => window.__los.ui.go('chapters'))
    await page.waitForSelector('[data-screen="chapters"] .btn', { timeout: 30000 })
    await page.locator('[data-screen="chapters"] .btn').nth(i).click()
    await wait((id) => window.__los.loader.state.getState().act === id && window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, id, 60000)
    await wait(() => !document.querySelector('[data-testid=card]'), null, 60000)
    await wait(() => window.__los.store.getState().screen === 'game' && !window.__los.store.getState().paused, null, 30000)
    // The act is running once game time moves.
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await wait((t) => window.__los.gameTime() > t + 1, t0, 60000)
  }

  const verify = async (id, label) => {
    const playing = await page.evaluate(() => window.__los.audio.playing())
    const stray = playing.filter((n) => LOOPS.includes(n) && !ALLOWED_LOOPS[id].includes(n))
    check(stray.length === 0, `${label}: sounds from another act still playing: ${stray.join(', ')} (all: ${playing.join(', ')})`)
    const queue = await page.evaluate(() => window.__los.audio.radioQueue())
    const prefix = id.slice(0, 4)
    const foreign = queue.filter((q) => /^act\d\./.test(q) && !q.startsWith(`${prefix}.`))
    check(foreign.length === 0, `${label}: radio lines from another act queued: ${foreign.join(', ')}`)
    const n = await page.evaluate(() => window.__los.systemCount())
    if (counts[id] === undefined) counts[id] = n
    check(n === counts[id], `${label}: ${n} frame systems, the first load of ${id} had ${counts[id]}`)
    const st = await page.evaluate(() => window.__los.loader.state.getState())
    check(st.status === 'ready' && st.act === id, `${label}: loader state ${JSON.stringify(st)}`)
  }

  /** Everything that must stand still while paused. */
  const snapshot = () =>
    page.evaluate(() => {
      const s = window.__los.store.getState()
      return JSON.stringify({
        gameTime: window.__los.gameTime(),
        timeline: window.__los.timeline(),
        objective: s.objective?.text ?? null,
        subtitle: s.subtitle?.text ?? null,
        radio: window.__los.audio.radioQueue(),
        anomalies: s.anomaliesSeen,
        director: window.__los.director,
        act4: window.__los.act4,
        pos: window.__los.player.body?.pos ?? null,
      })
    })

  const pauseAndResume = async (id) => {
    // Pause at a random moment 1 to 4 s of game time into the act.
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await wait(([t, d]) => window.__los.gameTime() > t + d, [t0, 1 + Math.random() * 3], 60000)
    await page.keyboard.press('Escape')
    await wait(() => window.__los.store.getState().paused === true, null, 30000)
    const a = await snapshot()
    await page.waitForTimeout(3000)
    const b = await snapshot()
    check(a === b, `${id}: state moved while paused\n  before ${a}\n  after  ${b}`)
    await shot(`switch-pause-${id}`)
    await page.click('text=Resume')
    await wait(() => window.__los.store.getState().paused === false, null, 30000)
    const gt = JSON.parse(a).gameTime
    await wait((t) => window.__los.gameTime() > t + 0.5, gt, 60000)
    const after = await page.evaluate(() => window.__los.gameTime())
    check(after - gt < 12, `${id}: game time jumped from ${gt} to ${after} across the pause`)
    // The timeline continues from where it stopped, not from the start.
    const tl = JSON.parse(a).timeline
    if (tl !== null && tl > 2) {
      const now = await page.evaluate(() => window.__los.timeline())
      check(now === null || now >= tl, `${id}: timeline went back from ${tl} to ${now}`)
    }
  }

  // Pass 1: every act in order, with a pause in each.
  for (let i = 0; i < ACTS.length; i++) {
    await load(i)
    await verify(ACTS[i], `pass 1 ${ACTS[i]}`)
    await pauseAndResume(ACTS[i])
  }

  // Back to the title: nothing of the last act may be left running.
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  await page.click('text=Quit to title')
  await wait(() => window.__los.store.getState().screen === 'title', null, 30000)
  await page.waitForTimeout(500)
  titleBase = await page.evaluate(() => window.__los.systemCount())
  const left = await page.evaluate(() => window.__los.audio.playing().filter((n) => /_loop$/.test(n) && !/^(ship_hum|vent|footsteps)/.test(n)))
  check(left.length === 0, `quit to title: sounds still playing: ${left.join(', ')}`)

  // Pass 2: act 3, act 0, act 3, act 5, act 1.
  for (const i of [3, 0, 3, 5, 1]) {
    await load(i)
    await verify(ACTS[i], `pass 2 ${ACTS[i]}`)
  }
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  await page.click('text=Quit to title')
  await wait(() => window.__los.store.getState().screen === 'title', null, 30000)
  await page.waitForTimeout(500)
  const titleEnd = await page.evaluate(() => window.__los.systemCount())
  check(titleEnd === titleBase, `frame systems at the title: ${titleBase} at first, ${titleEnd} after ten loads`)
  console.log(`systems at title ${titleBase}, per act ${JSON.stringify(counts)}`)

  // Reduced motion, checked in the act 1 launch.
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: false }))
  await load(1)
  const normal = await page.evaluate(() => window.__los.look())
  await page.evaluate(() => window.__los.store.getState().setFear?.(0.8))
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: false }))
  const lookFull = await page.evaluate(() => window.__los.look())
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: true }))
  const lookReduced = await page.evaluate(() => window.__los.look())
  check(Math.abs(lookReduced.fringe - lookFull.fringe * 0.5) < 1e-6, `fringe ${lookReduced.fringe} should be half of ${lookFull.fringe}`)
  check(Math.abs(lookReduced.noise - lookFull.noise * 0.5) < 1e-6, `grain ${lookReduced.noise} should be half of ${lookFull.noise}`)
  check(normal.noise > 0, 'grain level read')
  check((await page.evaluate(() => window.__los.flicker())) < 0.5, 'flicker scale is softer with reduced motion')
  // The launch shake: at the liftoff shake peak, compare the two settings at the same timeline time.
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: false }))
  await wait(() => (window.__los.timeline() ?? 0) >= 8.5, null, 120000)
  // Freeze the timeline so both readings are taken at the same instant.
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  const shakeFull = await page.evaluate(() => window.__los.shake())
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: true }))
  const shakeReduced = await page.evaluate(() => window.__los.shake())
  check(shakeFull > 0, `launch shake at 8.5 s is ${shakeFull}`)
  check(Math.abs(shakeReduced - shakeFull * 0.25) < 1e-4, `shake ${shakeReduced} should be a quarter of ${shakeFull}`)
  await shot('switch-reduced')
  await page.evaluate(() => window.__los.store.getState().setSettings({ reducedMotion: false }))
} catch (e) {
  errors.push(`script: ${e.message.split('\n')[0]} at ${(e.stack.match(/switch.mjs:(\d+)/g) ?? []).join(' ')}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'switch-fail.png') })
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
