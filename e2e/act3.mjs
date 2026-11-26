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
    await wait(() => window.__los.loader.state.getState().act === 'act3-farside' && window.__los.player.body && window.__los.director && window.__los.act3, null, 40000)
  }
  const frames = async () => {
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await wait((t) => window.__los.gameTime() > t + 0.2, t0, 30000)
  }
  const cp = () => page.evaluate(() => window.__los.store.getState().checkpoint)
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
  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  // 1. Start: Buzz walks in the cabin, then the corridor. Hide in locker 0.
  await load('start')
  await wait(() => window.__los.player.body.mode === 'walk', null, 30000)
  await objective('Find Neil and Mike', 40000)
  await page.waitForTimeout(800)
  await shot('act3-cabin')
  await budget('start')
  await teleport(0, -4.2)
  await frames()
  await teleport(0, -5.4)
  await objective('Hide in the locker', 20000)
  check((await dir()).monster.mode === 'encounter', 'creature runs the encounter')
  await wait(() => window.__los.director.monster.pos.z > -15.6, null, 30000)
  await shot('act3-encounter')
  await page.keyboard.down('Space')
  await teleport(-0.3, -9.5)
  await useAt('act3:locker0', 'HIDE')
  await wait(() => window.__los.store.getState().moveMode === 'seated', null, 30000)
  await page.waitForTimeout(1500)
  await shot('act3-locker')
  await objective('Find Neil and Mike', 90000)
  await page.keyboard.up('Space')
  await page.waitForTimeout(1500)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().moveMode === 'walk', null, 30000)
  check((await cp()) === 'wp0', 'wp0 set')

  // 2. The impostor, then the cage.
  await teleport(0, -13.5)
  await frames()
  await teleport(0, -14.6)
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('impostor-capcom'), null, 30000)
  await subtitle('how many crew aboard', 30000)
  await teleport(0, -36.5)
  await frames()
  await teleport(0, -39.4)
  await wait(() => window.__los.store.getState().checkpoint === 'wp1', null, 30000)
  await shot('act3-cage')
  await useAt('act3:cage', 'OPEN')
  await wait(() => window.__los.act3.phase === 'cageOpen', null, 30000)
  await teleport(-0.3, -42.2)
  await useAt('act3:cdr', 'TAKE')
  await objective('Carry him back')
  check((await page.evaluate(() => window.__los.act3.carrying)) === 'cdr', 'carrying Neil')
  check((await page.evaluate(() => window.__los.act3.carriedFirst)) === 'cdr', 'carriedFirst is Neil')
  await page.waitForTimeout(800)
  await shot('act3-carry')
  await budget('carry')
  await teleport(-0.4, 5.4)
  await useAt('act3:bags', 'LAY DOWN')
  await objective('Go back for the other one')
  check((await cp()) === 'wp2', 'wp2 set')

  // 3. Silent corridor, second crewman, lunge, wake, choice.
  await teleport(0, -36.5)
  await frames()
  await teleport(0, -41.2)
  await wait(() => window.__los.store.getState().checkpoint === 'wp3', null, 30000)
  await useAt('act3:second', 'TAKE')
  await wait(() => window.__los.act3.phase === 'lunge', null, 30000)
  await page.waitForTimeout(700)
  await shot('act3-lunge')
  await wait(() => window.__los.act3.phase === 'choice', null, 90000)
  await shot('act3-choice')

  // 4. Pause during the choice, then pick with key 2.
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  await page.waitForTimeout(1000)
  check((await page.evaluate(() => window.__los.act3.phase)) === 'choice', 'still in the choice after the pause')
  await page.evaluate(() => window.__los.lock.resume())
  await wait(() => window.__los.store.getState().paused === false, null, 30000)
  await page.keyboard.press('Digit2')
  await wait(() => window.__los.store.getState().dreamChoice === 'fine', null, 30000)
  await wait(() => window.__los.loader.state.getState().act === 'act4-moon', null, 120000)
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
