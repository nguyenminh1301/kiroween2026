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
  const atTime = (t) => page.waitForFunction((t) => (window.__los.timeline() ?? 0) >= t, t, { timeout: 60000, polling: 50 })
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
  const unfocused = () => page.waitForFunction(() => !window.__los.focus(), null, { timeout: 15000 })
  const objective = (text) =>
    page.waitForFunction((t) => window.__los.store.getState().objective?.text?.includes(t), text, { timeout: 90000, polling: 100 })
  const aim = async (id) => {
    // Turn the seated view toward an interactable by its position.
    await page.evaluate((id) => {
      const it = window.__los.interactables().find((i) => i.id === id)
      const b = window.__los.player.body
      const eye = { x: b.pos.x, y: b.pos.y + 1.65, z: b.pos.z }
      const dx = it.position.x - eye.x
      const dy = it.position.y - eye.y
      const dz = it.position.z - eye.z
      window.__los.player.set({ yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) })
    }, id)
  }
  const useAt = async (id, verb) => {
    await aim(id)
    await page.waitForFunction((v) => window.__los.store.getState().target?.verb === v, verb, { timeout: 5000 })
    await page.keyboard.press('KeyE')
  }

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 15000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 20000 })
  await page.evaluate(() => window.__los.loader.loadAct('act1-launch'))
  await page.waitForFunction(
    () => window.__los.loader.state.getState().act === 'act1-launch' && window.__los.player.body && window.__los.timeline() !== null,
    null,
    { timeout: 40000 },
  )

  // Launch: pad shot, liftoff shot, cabin shake, staging shot.
  await atTime(2)
  await shot('act1-pad')
  await budget('pad shot')
  await atTime(7)
  await shot('act1-liftoff')
  await budget('liftoff shot')
  await atTime(9.4)
  await shot('act1-shake')
  await budget('cabin during shake')
  await atTime(11)
  await shot('act1-staging')
  await budget('staging shot')

  // The O2 line turns the view to the gauge, which counts as a sighting.
  await page.waitForFunction(() => /oxygen/.test(window.__los.store.getState().subtitle?.text ?? ''), null, { timeout: 40000, polling: 100 })
  await page.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('o2-for-four'), null, { timeout: 15000 })
  check(true, 'o2-for-four noticed')
  await shot('act1-o2')

  // Switch, then the DSKY three times.
  await objective('red switch')
  await unfocused()
  check(await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act1:switch').enabled), 'switch enabled')
  await shot('act1-switch')
  await useAt('act1:switch', 'FLIP')
  await objective('computer in front of you')
  await unfocused()
  for (let i = 0; i < 3; i++) {
    await useAt('act1:dsky', 'KEY IN')
    await page.waitForTimeout(250)
    if (i === 2) break
  }
  await page.waitForTimeout(500)
  // DSKY close up: look straight at it, narrow enough to fill the view.
  await page.evaluate(() => {
    const d = window.__los.interactables().find((i) => i.id === 'act1:dsky').position
    window.__los.player.set({ pos: { x: d.x, y: -0.48, z: -0.2 } })
    const dx = d.x - d.x
    const dy = d.y - 1.17
    const dz = d.z + 0.2 - 0
    window.__los.player.set({ yaw: Math.atan2(-dx, dz < 0 ? -dz : dz) * 0, pitch: Math.atan2(dy, -dz) })
  })
  await page.waitForTimeout(400)
  await shot('act1-dsky')
  check(await page.evaluate(() => window.__los.store.getState().objective === null), 'objective cleared after press 3')

  // TLI shot and the Earth in the window.
  await page.waitForFunction(() => window.__los.timeline() !== null, null, { timeout: 60000 })
  await atTime(3)
  await shot('act1-tli')
  await budget('TLI shot')
  await atTime(7.5)
  await page.waitForFunction(() => /Earth fits/.test(window.__los.store.getState().subtitle?.text ?? ''), null, { timeout: 15000, polling: 100 })
  await unfocused()
  await shot('act1-earth')

  // The act hands off to act 2.
  await page.waitForFunction(() => window.__los.store.getState().act === 'act2-coast' || window.__los.loader.state.getState().act === 'act2-coast', null, { timeout: 90000, polling: 200 })
  check(true, 'act2 loading')
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
