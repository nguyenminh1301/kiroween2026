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
  const info = () => page.evaluate(() => window.__los.act4)
  const pos = () => page.evaluate(() => ({ ...window.__los.player.body.pos }))
  const objective = (text, timeout) =>
    wait((t) => window.__los.store.getState().objective?.text?.includes(t), text, timeout)
  const unfocused = () => wait(() => !window.__los.focus(), null, 30000)
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
  const load = async (cp) => {
    await page.evaluate((cp) => window.__los.loader.loadAct('act4-moon', cp), cp)
    await wait(() => window.__los.loader.state.getState().act === 'act4-moon' && window.__los.player.body && window.__los.act4, null, 40000)
  }
  const teleport = (x, z, yaw = 0) =>
    page.evaluate(([x, z, yaw]) => window.__los.player.set({ pos: { x, y: 0, z }, yaw, pitch: 0 }), [x, z, yaw])
  const face = (x, z) =>
    page.evaluate(([x, z]) => {
      const b = window.__los.player.body
      window.__los.player.set({ yaw: Math.atan2(-(x - b.pos.x), -(z - b.pos.z)), pitch: 0 })
    }, [x, z])
  const aim = (id) =>
    page.evaluate((id) => {
      const it = window.__los.interactables().find((i) => i.id === id)
      const b = window.__los.player.body
      const dx = it.position.x - b.pos.x
      const dy = it.position.y - (b.pos.y + 1.65)
      const dz = it.position.z - b.pos.z
      window.__los.player.set({ yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) })
    }, id)
  const useAt = async (id) => {
    await unfocused()
    await wait((id) => window.__los.interactables().find((i) => i.id === id)?.enabled, id, 30000)
    await aim(id)
    await wait(() => window.__los.store.getState().target?.verb === 'GRAB', null, 30000)
    await page.keyboard.press('KeyE')
  }
  /** Teleport to 4 m short of the point, then walk the rest with real W presses. */
  const walkTo = async (x, z, stop = 1.2) => {
    const b = await pos()
    const d = Math.hypot(x - b.x, z - b.z)
    if (d > 4) {
      const k = (d - 4) / d
      await teleport(b.x + (x - b.x) * k, b.z + (z - b.z) * k)
    }
    await face(x, z)
    await page.keyboard.down('KeyW')
    for (let i = 0; i < 80; i++) {
      const p = await pos()
      if (Math.hypot(x - p.x, z - p.z) <= stop) break
      await face(x, z)
      await page.waitForTimeout(100)
    }
    await page.keyboard.up('KeyW')
  }

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  // 1. Descent.
  await load('start')
  check((await info()).phase === 'descent', 'descent phase at start')
  check(await page.evaluate(() => window.__los.player.body.mode === 'seated'), 'seated in the descent')
  await wait(() => window.__los.act4.time >= 3, null, 60000)
  await shot('act4-descent-3s')
  await wait(() => window.__los.act4.time >= 9, null, 60000)
  await shot('act4-descent-9s')
  await shot('act4-descent')
  await budget('descent')
  await wait(() => window.__los.act4.time >= 20, null, 60000)
  await shot('act4-descent-20s')
  check((await info()).landerY < 2, 'lander nearly down at 20 s')

  // 2. The surface.
  await objective('Surface tasks, any order', 120000)
  check((await info()).phase === 'eva', 'eva phase')
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'tasks'), 'tasks checkpoint')
  check(await page.evaluate(() => window.__los.player.body.mode === 'walk'), 'walking on the surface')
  await page.waitForTimeout(500)
  await shot('act4-surface')
  await budget('surface')

  // 3. Sample, flag, seismometer, in that order, with real key presses.
  await teleport(-0.75, 3.4)
  await useAt('act4:scoop')
  await wait(() => window.__los.act4.carrying === 'scoop', null, 30000)
  await objective('Take the scoop to the sample marker', 5000)
  check(await page.evaluate(() => !window.__los.interactables().find((i) => i.id === 'act4:flagkit').enabled), 'one item at a time')
  await walkTo(9, 4.5)
  await useAt('act4:sample')
  await wait(() => window.__los.act4.done.includes('sample'), null, 30000)
  await objective('Surface tasks, any order: Plant the flag. Set up the seismometer', 5000)

  await teleport(1.7, 4.6)
  await useAt('act4:flagkit')
  await wait(() => window.__los.act4.carrying === 'flag', null, 30000)
  await walkTo(-1.5, 9)
  await useAt('act4:spot')
  await wait(() => window.__los.act4.done.includes('flag'), null, 30000)
  await page.waitForTimeout(600)
  await face(-1.5, 9)
  await page.evaluate(() => window.__los.player.set({ pitch: -0.2 }))
  await shot('act4-flag')

  await teleport(-1.35, 3.3)
  await useAt('act4:seismokit')
  await wait(() => window.__los.act4.carrying === 'seismo', null, 30000)
  await walkTo(-8, -5)
  await useAt('act4:seismo')

  // 4. The creature comes up and the run objective shows.
  await wait(() => window.__los.act4.phase === 'emerge', null, 60000)
  await objective('Run to the ladder', 5000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'run'), 'run checkpoint')
  check(await page.evaluate(() => window.__los.store.getState().tension === 'CHASE'), 'tension CHASE')
  await wait(() => window.__los.act4.creature?.phase === 'rim', null, 30000)
  await shot('act4-emerge')

  // 5. Jump once, then run to the ladder.
  await unfocused()
  await page.keyboard.press('Space')
  await wait(() => window.__los.player.body.pos.y > 0.05, null, 30000)
  check(true, 'left the ground')
  await teleport(-3.5, 7.5)
  await walkTo(0, 5.5, 0.9)
  await wait(() => window.__los.act4.phase === 'emerge', null, 30000)
  await useAt('act4:ladder')
  await wait(() => window.__los.act4.phase === 'climb' || window.__los.act4.phase === 'liftoff', null, 30000)

  // 6. Liftoff.
  await wait(() => window.__los.act4.phase === 'liftoff' && window.__los.act4.time >= 1.1, null, 30000)
  await shot('act4-leap')
  await wait(() => window.__los.act4.time >= 3.2, null, 60000)
  await shot('act4-climb')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('burn-baby-burn')), 'burn-baby-burn noticed')
  await budget('liftoff')
  await wait(() => window.__los.act4.time >= 9.5, null, 60000)
  await shot('act4-liftoff')
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' || window.__los.loader.state.getState().status === 'loading', null, 120000)
  check(true, 'act 5 loading')

  // 7. Caught at run: stand still.
  await load('run')
  await wait(() => window.__los.act4.phase === 'emerge', null, 30000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'run'), 'run checkpoint at load')
  await page.waitForFunction(() => !!document.querySelector('[data-testid=caught]'), null, { timeout: 90000, polling: 100 })
  await page.waitForTimeout(300)
  await shot('act4-caught')
  await wait(() => !document.querySelector('[data-testid=caught]') && window.__los.act4?.creature?.phase === 'rising', null, 30000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'run'), 'restarted at run')
  const p = await pos()
  check(Math.hypot(p.x + 8, p.z + 5) < 1.5, 'back at the seismometer site')
} catch (e) {
  errors.push(`script: ${e.message.split('\n')[0]} at ${(e.stack.match(/act4.mjs:(\d+)/g) ?? []).join(' ')}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'act4-fail.png') })
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
