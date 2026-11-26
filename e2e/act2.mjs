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
  const unfocused = () => page.waitForFunction(() => !window.__los.focus(), null, { timeout: 30000, polling: 100 })
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
      await page.waitForFunction((v) => window.__los.store.getState().target?.verb === v, verb, { timeout: 30000 })
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
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await page.keyboard.press('KeyE')
    // Let the push play out for 1.5 s of game time, whatever the frame rate.
    await page.waitForFunction((t) => window.__los.gameTime() > t + 1.5, t0, { timeout: 60000, polling: 100 })
    const after = await z()
    if (Math.abs(after - before) > 0.3) pushes++
  }

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 30000 })
  await page.evaluate(() => window.__los.loader.loadAct('act2-coast'))
  await page.waitForFunction(
    () => window.__los.loader.state.getState().act === 'act2-coast' && window.__los.player.body,
    null,
    { timeout: 40000 },
  )
  await objective('Repairs left')
  check(await page.evaluate(() => window.__los.player.body.mode === 'zeroG'), 'zero-g body')
  await subtitle('Three small items')
  await page.waitForTimeout(1200)
  await shot('act2-start')
  await budget('start')
  const hold = () => page.evaluate(() => window.__los.player.set({ vel: { x: 0, y: 0, z: 0 } }))
  const enabled = (id) => page.evaluate((id) => window.__los.interactables().find((i) => i.id === id)?.enabled, id)

  // Cabin pressure in the command module: E, then A or D, hold the needle in the green band.
  check(!(await page.evaluate(() => window.__los.focus())), 'no scripted turn at the start')
  await hold()
  await useAt('act2:gauge', 'ADJUST')
  await page.waitForSelector('[data-testid="gauge"]', { timeout: 10000 })
  await shot('act2-gauge')
  const reading = () => page.evaluate(() => parseFloat(document.querySelector('[data-testid="gauge"] text:last-of-type')?.textContent ?? '0'))
  await page.keyboard.down('KeyD')
  for (let i = 0; i < 400 && (await reading()) < 4.6; i++) await page.waitForTimeout(30)
  await page.keyboard.up('KeyD')
  await page.waitForFunction(() => !document.querySelector('[data-testid="gauge"]'), null, { timeout: 30000, polling: 100 })
  await subtitle('five point zero')
  check(!(await enabled('act2:gauge')), 'gauge is done')

  // Outbound: push along the tunnel with real E presses.
  for (let i = 0; i < 100 && (await z()) > 0.6; i++) await push(0)
  check(pushes >= 1, `at least one real push, got ${pushes}`)
  if ((await z()) > 0.6) await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: 0.5 } }))
  await subtitle('hiss is the oxygen line')

  // Oxygen line: hammer from the pouch, three taps on the joint.
  check(!(await enabled('act2:joint')), 'joint needs the hammer')
  await hold()
  await useAt('act2:pouch', 'TAKE')
  await page.waitForFunction(() => window.__los.interactables().find((i) => i.id === 'act2:joint')?.enabled, null, { timeout: 10000 })
  await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -0.4 }, vel: { x: 0, y: 0, z: 0 } }))
  await shot('act2-hose')
  for (let i = 0; i < 3; i++) {
    await hold()
    await useAt('act2:joint', 'TAP')
    await page.waitForTimeout(300)
  }
  await subtitle('Oxygen flow looks steady')
  check(!(await enabled('act2:joint')), 'joint is done after three taps')

  // Computer in the lander: three buttons.
  for (let i = 0; i < 100 && (await z()) > -3.2; i++) await push(0)
  if ((await z()) > -3.2) await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -3.6 } }))
  await subtitle('three faults')
  await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -5 }, vel: { x: 0, y: 0, z: 0 } }))
  for (let i = 0; i < 3; i++) {
    await hold()
    await useAt(`act2:comp${i}`, 'CLEAR')
    await page.waitForTimeout(300)
  }
  await subtitle('Computer is clean')
  await shot('act2-computer')
  await objective('Float back up the tunnel')
  check(!(await page.evaluate(() => window.__los.focus())), 'no scripted turn in the lander')

  // Back: the tunnel is longer, so it takes more pushes.
  const before = pushes
  for (let i = 0; i < 100; i++) {
    const seen = await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('tunnel-longer'))
    if (seen) break
    await push(Math.PI)
  }
  await page.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('tunnel-longer'), null, { timeout: 30000 })
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

  // Hold C: fade to black over two seconds, slow breathing, no flashes. Six seconds closed marks the fourth sleeper.
  await page.keyboard.down('KeyC')
  await page.waitForFunction(() => parseFloat(document.querySelector('.fx-black')?.style.opacity ?? '0') > 0.95, null, { timeout: 30000, polling: 100 })
  await shot('act2-dark')
  check((await page.evaluate(() => document.querySelectorAll('.fx-flash, .fx-figure').length)) === 0, 'no flashes or figure in the dark')
  await page.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('fourth-sleeper'), null, { timeout: 90000, polling: 200 })
  check((await page.evaluate(() => document.querySelectorAll('.fx-flash, .fx-figure').length)) === 0, 'still no flashes')
  // Act 2 ends after 12 s of eyes closed in total, so keep C held until act 3 loads.
  await page.waitForFunction(
    () => window.__los.store.getState().act === 'act3-farside' || window.__los.loader.state.getState().act === 'act3-farside',
    null,
    { timeout: 30000, polling: 200 },
  )
  await page.keyboard.up('KeyC')
  check(true, 'act3 loading')
} catch (e) {
  errors.push(`script: ${e.message.split("\n")[0]} at ${(e.stack.match(/act2.mjs:(\d+)/g) ?? []).join(" ")}`)
} finally {
  await browser.close()
}

if (errors.length) {
  console.log(errors.join('\n'))
  process.exit(1)
}
console.log('errors: none')
