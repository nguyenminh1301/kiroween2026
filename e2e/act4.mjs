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
  const useAt = async (id, verb = 'GRAB') => {
    await unfocused()
    await wait((id) => window.__los.interactables().find((i) => i.id === id)?.enabled, id, 30000)
    await aim(id)
    await wait(([v, id]) => window.__los.store.getState().target?.verb === v || !window.__los.interactables().find((i) => i.id === id)?.enabled, [verb, id], 30000)
    if (!(await page.evaluate((id) => window.__los.interactables().find((i) => i.id === id)?.enabled, id))) return
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

  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('alarm-1202')), 'alarm-1202 seen in the descent')

  // 2. Neil climbs down first, seen from the hatch. Then the player's ladder: crawl out, nine rungs, a drop, a step off.
  await wait(() => window.__los.act4.phase === 'neil', null, 60000)
  check(await page.evaluate(() => window.__los.act4.neil.visible), 'Neil is shown on the ladder')
  await wait(() => window.__los.act4.time >= 2.5, null, 60000)
  await shot('act4-neil-ladder')
  check(await page.evaluate(() => window.__los.act4.neil.anim === 'ladder'), 'Neil climbs the rungs')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('eagle-landed')), 'eagle-landed seen')
  await wait(() => window.__los.act4.phase === 'exit', null, 60000)
  check(await page.evaluate(() => window.__los.player.body.mode === 'seated'), 'seated while climbing down')
  await wait(() => window.__los.act4.time >= 2.6, null, 60000)
  const porchY = (await pos()).y
  await page.evaluate(() => window.__los.player.set({ yaw: 0.5 }))
  await page.waitForTimeout(250)
  check(await page.evaluate(() => Math.abs(window.__los.player.body.yaw - 0.5) < 0.2), 'mouse look works on the ladder')
  await shot('act4-climb-porch')
  await wait(() => window.__los.act4.time >= 4.4, null, 60000)
  await shot('act4-climb-rungs')
  const rungY = (await pos()).y
  check(porchY > 1.8 && rungY < porchY - 0.5, `climbing down: porch ${porchY.toFixed(2)}, rung ${rungY.toFixed(2)}`)
  await wait(() => window.__los.act4.time >= 6.4, null, 60000)
  await shot('act4-climb-drop')
  check((await pos()).y < rungY, 'dropping')

  // 3. The surface.
  await objective('Surface tasks, any order', 120000)
  check(await page.evaluate(() => window.__los.player.body.pos.z > 4.5), 'stepped off onto the dust beyond the footpad')
  check((await info()).phase === 'eva', 'eva phase')
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'tasks'), 'tasks checkpoint')
  check(await page.evaluate(() => window.__los.player.body.mode === 'walk'), 'walking on the surface')
  await page.waitForTimeout(500)
  await shot('act4-surface')
  await budget('surface')

  // 4. Sample, flag, photo, seismometer, in that order, with real key presses.
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

  // 5. The photo: walk to the mark, press E, a flash and the print, then close it with E.
  await objective('Stand by the flag for the photo', 5000)
  await walkTo(0.2, 9.4, 1.0)
  await useAt('act4:photo', 'POSE')
  await page.waitForFunction(() => !!document.querySelector('[data-testid=photo]'), null, { timeout: 30000, polling: 100 })
  await page.waitForTimeout(900)
  await shot('act4-photo')
  check(await page.evaluate(() => document.querySelector('[data-testid=photo] figcaption')?.textContent?.includes('AS11-40-5875')), 'photo caption names the frame')
  check(await page.evaluate(() => document.querySelector('[data-testid=photo] img')?.complete && document.querySelector('[data-testid=photo] img').naturalWidth > 100), 'photo loaded')
  await page.keyboard.press('KeyE')
  await page.waitForFunction(() => !document.querySelector('[data-testid=photo]'), null, { timeout: 5000, polling: 100 })
  check(true, 'E closes the photo')
  await wait(() => ['walk', 'scoop', 'kneel', 'write', 'camera'].includes(window.__los.act4.neil.anim) && window.__los.act4.neil.anim !== 'camera', null, 15000)
  check(true, 'Neil goes to work after the photo')
  await shot('act4-neil-works')

  await teleport(-1.35, 3.3)
  await useAt('act4:seismokit')
  await wait(() => window.__los.act4.carrying === 'seismo', null, 30000)
  await walkTo(-8, -5)
  await useAt('act4:seismo')
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('seismo-steps'), null, 15000)
  check(true, 'seismo-steps seen')

  // 6. Back to the ladder.
  await wait(() => window.__los.act4.phase === 'return', null, 60000)
  await objective('Go back to the ladder', 5000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'run'), 'run checkpoint')
  await shot('act4-return')

  // 7. The soft limit: walking straight out stops short of 80 m.
  await teleport(0, 76, 0)
  await page.evaluate(() => window.__los.player.set({ yaw: Math.PI, pitch: 0 }))
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(3500)
  await page.keyboard.up('KeyW')
  const far = await pos()
  check(Math.hypot(far.x, far.z) <= 80.2, `soft limit holds at ${Math.hypot(far.x, far.z).toFixed(1)} m`)
  await shot('act4-far')

  // 8. Climb up: faster, then liftoff.
  await teleport(0, 5.2, 0)
  await useAt('act4:ladder', 'CLIMB')
  await wait(() => window.__los.act4.phase === 'climb', null, 30000)
  await wait(() => window.__los.act4.time >= 1.2, null, 30000)
  await shot('act4-climb-up')
  await wait(() => window.__los.act4.phase === 'liftoff' && window.__los.act4.time >= 0.5, null, 30000)
  await shot('act4-liftoff-start')
  await wait(() => window.__los.act4.time >= 2.4, null, 60000)
  check(await page.evaluate(() => document.querySelector('[data-testid=readout]')?.textContent?.includes('LUMINARY 099')), 'AGC readout panel shows')
  await shot('act4-readout')
  await wait(() => window.__los.act4.time >= 4.4, null, 60000)
  check(await page.evaluate(() => document.querySelector('[data-testid=readout]')?.textContent?.includes('BURN_BABY_BURN--MASTER_IGNITION_ROUTINE')), 'routine name typed in the panel')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('burn-routine')), 'burn-routine seen')
  await budget('liftoff')
  await wait(() => window.__los.act4.time >= 5.9, null, 60000)
  check(await page.evaluate(() => !document.querySelector('[data-testid=readout]')), 'readout gone after 4 s')
  await shot('act4-liftoff-5s')
  await wait(() => window.__los.act4.time >= 9.5, null, 60000)
  await shot('act4-liftoff')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('flag-knocked')), 'flag-knocked seen')
  await wait(() => window.__los.act4.time >= 13.4, null, 60000)
  check(await page.evaluate(() => Number(document.querySelector('.fx-black')?.style.opacity ?? 0) > 0.5), 'fading to black at the end of the shot')
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' || window.__los.loader.state.getState().status === 'loading', null, 120000)
  check(true, 'act 5 loading')

  // 9. The run checkpoint: back at the ladder, all tasks done.
  await load('run')
  await wait(() => window.__los.act4.phase === 'return', null, 30000)
  check(await page.evaluate(() => window.__los.store.getState().checkpoint === 'run'), 'run checkpoint at load')
  const p = await pos()
  check(Math.hypot(p.x, p.z - 5.2) < 1, 'run checkpoint is on the dust by the ladder')
  check(await page.evaluate(() => !window.__los.interactables().some((i) => i.id.includes('creature'))), 'no creature')
} catch (e) {
  try { errors.push('state: ' + JSON.stringify(await browser.contexts()[0].pages()[0].evaluate(() => ({ a: window.__los.act4, i: window.__los.interactables().map((i) => [i.id, i.enabled]) })))) } catch { /* no page */ }
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
