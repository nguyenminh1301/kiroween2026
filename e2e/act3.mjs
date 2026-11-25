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
  const shot = (name) => page.screenshot({ path: join(shotDir, `${name}.png`) })
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 })
  const objective = (text, timeout) =>
    wait((t) => window.__los.store.getState().objective?.text?.includes(t), text, timeout)
  const subtitle = (text, timeout) =>
    wait((t) => (window.__los.store.getState().subtitle?.text ?? '').includes(t), text, timeout)
  const unfocused = () => wait(() => !window.__los.focus(), null, 30000)
  const dir = () => page.evaluate(() => window.__los.director)
  const body = () => page.evaluate(() => ({ ...window.__los.player.body.pos }))
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
  const load = async (cp) => {
    await page.evaluate((cp) => window.__los.loader.loadAct('act3-farside', cp), cp)
    await wait(() => window.__los.loader.state.getState().act === 'act3-farside' && window.__los.player.body && window.__los.director, null, 40000)
  }
  const teleport = (x, z, yaw = 0) =>
    page.evaluate(([x, z, yaw]) => window.__los.player.set({ pos: { x, y: 0.2, z }, yaw, pitch: 0 }), [x, z, yaw])
  const aim = (id) =>
    page.evaluate((id) => {
      const it = window.__los.interactables().find((i) => i.id === id)
      const b = window.__los.player.body
      const dx = it.position.x - b.pos.x
      const dy = it.position.y - (b.pos.y + 1.65)
      const dz = it.position.z - b.pos.z
      window.__los.player.set({ yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) })
    }, id)
  const useAt = async (id, verb) => {
    await unfocused()
    await aim(id)
    await wait((v) => window.__los.store.getState().target?.verb === v, verb, 30000)
    await page.keyboard.press('KeyE')
  }
  let pushes = 0
  // One real E press. Then wait for the push to show in the velocity, but for at most 0.25 s of
  // GAME time, so a slow machine does not give the creature extra time and a missed press is retried.
  const push = async (yaw) => {
    await unfocused()
    const mark = await page.evaluate(() => {
      const v = window.__los.player.body.vel
      return { speed: Math.hypot(v.x, v.y, v.z), t: window.__los.gameTime() }
    })
    await page.evaluate((yaw) => window.__los.player.set({ yaw, pitch: 0 }), yaw)
    await page.keyboard.press('KeyE')
    await wait((m) => {
      const v = window.__los.player.body.vel
      return Math.abs(Math.hypot(v.x, v.y, v.z) - m.speed) > 0.05 || window.__los.gameTime() > m.t + 0.25
    }, mark, 30000)
    pushes++
  }

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  // 1. Start: wake, then sneak to the encounter and hide in locker 0.
  await load('start')
  check(await page.evaluate(() => window.__los.player.body.mode === 'zeroG'), 'zero-g body')
  check((await dir()).state.phase === 'sneak', 'sneak phase at start')
  await subtitle('Wake up', 40000)
  await page.waitForTimeout(1200)
  await shot('act3-wake')
  await budget('start')
  await objective('Find Mike', 90000)
  for (let i = 0; i < 200 && (await body()).z > -5.2; i++) await push(0)
  check(pushes >= 2, `real pushes along the corridor, got ${pushes}`)
  // Stop drifting, so the player does not coast past the next checkpoint while the encounter starts.
  await page.evaluate(() => window.__los.player.set({ vel: { x: 0, y: 0, z: 0 } }))
  if ((await body()).z > -5.1) await teleport(0, -5.4)
  await objective('Hide in the locker', 20000)
  check((await dir()).monster.mode === 'encounter', 'creature runs the encounter')
  await wait(() => window.__los.director.monster.pos.z > -15.6, null, 30000)
  await page.waitForTimeout(300)
  await shot('act3-encounter')
  await page.keyboard.down('Space')
  await teleport(-0.3, -9.5)
  await useAt('act3:locker0', 'HIDE')
  await wait(() => window.__los.store.getState().moveMode === 'seated', null, 30000)
  // The creature walks up to 3 to 4 m from the player and stands there, in the flashlight.
  await page.evaluate(() => {
    window.__stall = { z: null, since: performance.now() }
  })
  await wait(
    () => {
      const z = window.__los.director.monster.pos.z
      const s = window.__stall
      if (s.z === null || Math.abs(z - s.z) > 0.01) {
        s.z = z
        s.since = performance.now()
      }
      return performance.now() - s.since > 400 && z > -16
    },
    null,
    30000,
  )
  const stopDist = await page.evaluate(() => {
    const m = window.__los.director.monster.pos
    const p = window.__los.player.body.pos
    return Math.hypot(m.x - p.x, m.z - p.z)
  })
  check(stopDist >= 3 && stopDist <= 4, `creature stops ${stopDist.toFixed(2)} m from the player, expected 3 to 4`)
  await page.waitForTimeout(1000)
  await shot('act3-locker')
  await subtitle('Hold your breath', 20000)
  await objective('Reach Mike', 90000)
  await page.keyboard.up('Space')
  check((await dir()).state.phase === 'sneak', 'not caught during the encounter')
  await subtitle('It went by', 20000)
  await page.waitForTimeout(1500)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().moveMode === 'zeroG', null, 30000)
  check((await body()).x > -1, 'stepped out of the locker')
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'wp0'), 'wp0 set')

  // 2. Make noise near the creature, hide, wait for it to give up. Also the impostor at wp1.
  await load('wp1')
  await teleport(0, -12.6)
  await subtitle('how many crew aboard', 20000)
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('impostor-capcom')), 'impostor anomaly')
  await subtitle('That is not Houston', 60000)
  await teleport(0, -16.6)
  await page.keyboard.down('Space')
  for (let i = 0; i < 10; i++) {
    if ((await dir()).monster.mode !== 'patrol') break
    await page.keyboard.up('Space')
    await page.keyboard.press('KeyE')
    await page.keyboard.down('Space')
    await page.waitForTimeout(150)
  }
  await wait(() => ['alert', 'hunt'].includes(window.__los.director.monster.mode), null, 30000)
  await subtitle('It heard you', 8000)
  await teleport(-0.3, -9.5)
  await useAt('act3:locker0', 'HIDE')
  await wait(() => window.__los.store.getState().moveMode === 'seated', null, 30000)
  await wait(() => ['hunt', 'search'].includes(window.__los.director.monster.mode), null, 30000)
  await subtitle('It lost you', 90000)
  await page.keyboard.up('Space')
  check((await dir()).state.phase === 'sneak', 'not caught while hidden')
  await objective('Reach Mike', 10000)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().moveMode === 'zeroG', null, 30000)
  // 3. The reveal from wp2, then the chase to the hatch with real key presses.
  await load('wp2')
  await teleport(0, -37.5)
  await page.waitForTimeout(300)
  await teleport(0, -38.3)
  await subtitle('You came', 20000)
  await wait(() => window.__los.director.state.phase === 'reveal', null, 30000)
  await page.waitForTimeout(2200)
  await shot('act3-reveal')
  await wait(() => window.__los.director.state.phase === 'chase', null, 30000)
  await objective('Run', 5000)
  await page.waitForTimeout(800)
  await shot('act3-chase')
  await budget('chase')
  await unfocused()
  const startedAt = await body()
  for (let i = 0; i < 200 && (await body()).z < 1.4; i++) {
    const d = await dir()
    if (d.state.phase !== 'chase') break
    await push(Math.PI)
  }
  check(['chase', 'slam'].includes((await dir()).state.phase), 'still running, not caught')
  check((await body()).z > startedAt.z + 20, 'ran toward the hatch')
  // A push aimed at the hatch near the end already uses it, so only use it when still running.
  if ((await dir()).state.phase === 'chase') {
    await wait(() => window.__los.interactables().find((i) => i.id === 'act3:hatch')?.enabled, null, 30000)
    check(true, 'hatch enabled in the chase')
    await useAt('act3:hatch', 'GRAB')
  }
  await wait(() => window.__los.loader.state.getState().act === 'act4-moon', null, 120000)
  check(true, 'act 4 loading')

  // 4. Do nothing in the chase: caught, then back at wp3.
  await load('wp3')
  await wait(() => window.__los.director.state.phase === 'chase', null, 30000)
  await page.waitForFunction(() => !!document.querySelector('[data-testid=caught]'), null, { timeout: 60000, polling: 100 })
  await page.waitForTimeout(500)
  await shot('act3-caught')
  await wait(() => !document.querySelector('[data-testid=caught]') && window.__los.director?.state.phase === 'chase', null, 30000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'wp3'), 'restarted at wp3')
  check(Math.abs((await body()).z + 38.5) < 1.5, 'back at the wp3 position')

  // 5. Pause in the chase: the gap holds still.
  await load('wp3')
  await wait(() => window.__los.director.state.phase === 'chase', null, 30000)
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  const g0 = (await dir()).state.gap
  await page.waitForTimeout(5000)
  const g1 = (await dir()).state.gap
  check(g0 === g1, `gap moved while paused: ${g0} -> ${g1}`)
  check((await dir()).state.phase === 'chase', 'still in the chase after the pause')
} catch (e) {
  errors.push(`script: ${e.message.split("\n")[0]} at ${(e.stack.match(/act3.mjs:(\d+)/g) ?? []).join(" ")}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'act3-fail.png') })
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
