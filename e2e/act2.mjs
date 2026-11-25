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
  const objective = (text, timeout = 60000) =>
    page.waitForFunction((t) => window.__los.store.getState().objective?.text?.includes(t), text, { timeout, polling: 100 })
  const subtitle = (text, timeout = 30000) =>
    page.waitForFunction((t) => (window.__los.store.getState().subtitle?.text ?? '').includes(t), text, { timeout, polling: 100 })
  const unfocused = () => page.waitForFunction(() => !window.__los.focus(), null, { timeout: 20000, polling: 100 })
  const z = () => page.evaluate(() => window.__los.player.body.pos.z)
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
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
    await aim(id)
    try {
      await page.waitForFunction((v) => window.__los.store.getState().target?.verb === v, verb, { timeout: 5000 })
    } catch (e) {
      const d = await page.evaluate(() => ({ b: window.__los.player.body, t: window.__los.store.getState().target }))
      await shot('act2-fail')
      throw new Error(`no ${verb} target for ${id}: ${JSON.stringify(d)}`)
    }
    await page.keyboard.press('KeyE')
  }
  // Real E presses on rails: look along the tunnel, press, wait for the push to settle.
  let pushes = 0
  const push = async (yaw) => {
    await unfocused()
    await page.evaluate((yaw) => window.__los.player.set({ yaw, pitch: 0 }), yaw)
    const before = await z()
    await page.keyboard.press('KeyE')
    await page.waitForTimeout(1500)
    const after = await z()
    if (Math.abs(after - before) > 0.3) pushes++
  }

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 15000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 20000 })
  await page.evaluate(() => window.__los.loader.loadAct('act2-coast'))
  await page.waitForFunction(
    () => window.__los.loader.state.getState().act === 'act2-coast' && window.__los.player.body,
    null,
    { timeout: 40000 },
  )
  await objective('Float down the tunnel')
  check(await page.evaluate(() => window.__los.player.body.mode === 'zeroG'), 'zero-g body')
  await subtitle('Neil and I')
  await page.waitForTimeout(1200)
  await shot('act2-start')
  await budget('start')

  // Outbound: push along the tunnel with real E presses.
  await unfocused()
  for (let i = 0; i < 14 && (await z()) > -3.2; i++) await push(0)
  check(pushes >= 2, `at least two real pushes, got ${pushes}`)
  if ((await z()) > -3.2) {
    await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -3.6 } }))
  }
  await objective('Find something to push')
  await unfocused()

  check(await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:pen').enabled), 'pen enabled')
  check(!(await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:breaker').enabled)), 'breaker disabled before pen')
  const pen = await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:pen').position)
  const pz = await z()
  if (Math.hypot(pen.z - pz) > 2) await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -3.6 } }))
  await useAt('act2:pen', 'GRAB')
  await objective('Push the breaker in')
  await unfocused()
  check(await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:breaker').enabled), 'breaker enabled with pen')
  await page.evaluate(() => window.__los.player.set({ pos: { x: -0.2, y: 0.3, z: -4.4 } }))
  await aim('act2:breaker')
  await page.waitForTimeout(500)
  await shot('act2-breaker')
  await useAt('act2:breaker', 'GRAB')
  await objective('Float back up the tunnel')
  await unfocused()

  // Back: the tunnel is longer, so it takes more pushes.
  const before = pushes
  for (let i = 0; i < 20; i++) {
    const seen = await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('tunnel-longer'))
    if (seen) break
    await push(Math.PI)
  }
  await page.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('tunnel-longer'), null, { timeout: 5000 })
  check(pushes - before >= 3, `the way back took ${pushes - before} pushes, expected at least 3`)
  await subtitle('You were gone a while')
  await page.waitForTimeout(1500)
  await shot('act2-longer')
  await budget('command module')

  // Bag.
  await objective('sleeping bag')
  await unfocused()
  const bag = await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:bag').position)
  const b = await page.evaluate(() => window.__los.player.body.pos)
  if (Math.hypot(bag.x - b.x, bag.z - b.z) > 2) {
    await page.evaluate((bz) => window.__los.player.set({ pos: { x: 0, y: 0.3, z: bz } }), bag.z)
  }
  await useAt('act2:bag', 'SLEEP')
  await objective('Hold C')
  await page.waitForTimeout(600)
  check(await page.evaluate(() => window.__los.store.getState().moveMode === 'seated'), 'seated in the bag')
  await shot('act2-bag')
  check(
    !(await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:bag').enabled)),
    'bag disabled once in',
  )

  // Hold C: flashes, then the fourth sleeper, then the hand-off.
  await page.keyboard.down('KeyC')
  await page.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('fourth-sleeper'), null, { timeout: 90000, polling: 200 })
  await page.keyboard.up('KeyC')
  await page.waitForFunction(
    () => window.__los.store.getState().act === 'act3-farside' || window.__los.loader.state.getState().act === 'act3-farside',
    null,
    { timeout: 30000, polling: 200 },
  )
  check(true, 'act3 loading')
} catch (e) {
  errors.push(`script: ${e.message}`)
} finally {
  await browser.close()
}

if (errors.length) {
  console.log(errors.join('\n'))
  process.exit(1)
}
console.log('errors: none')
