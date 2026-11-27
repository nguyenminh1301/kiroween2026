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
  const atTime = (t) => page.waitForFunction((t) => (window.__los.timeline() ?? 0) >= t, t, { timeout: 200000, polling: 50 })
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
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
    await page.waitForFunction((v) => window.__los.store.getState().target?.verb === v, verb, { timeout: 30000 })
    await page.keyboard.press('KeyE')
  }

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 30000 })
  await page.evaluate(() => window.__los.loader.loadAct('act1-launch'))
  await page.waitForFunction(
    () => window.__los.loader.state.getState().act === 'act1-launch' && window.__los.player.body && window.__los.timeline() !== null,
    null,
    { timeout: 40000 },
  )

  // Launch (about 30 s): pad shot, liftoff shot, cabin shake, staging and jettison shots.
  await atTime(2)
  await shot('act1-pad')
  await budget('pad shot')
  await atTime(5.8)
  await shot('act1-smoke')
  await budget('smoke shot')
  await atTime(7)
  await shot('act1-liftoff')
  await budget('liftoff shot')
  await atTime(9.4)
  check((await page.evaluate(() => document.querySelector('[data-testid=print]')?.textContent ?? '')).includes('S69-39961'), 'the real liftoff print slides in after the first outside shot')
  await shot('act1-shake')
  await budget('cabin during shake')
  await atTime(23.5)
  await shot('act1-staging')
  await budget('staging shot')

  // Upper stages: the later beats never turn the view. Then the DSKY three times.
  await atTime(26)
  await shot('act1-jettison')
  await budget('jettison shot')
  await page.waitForFunction(() => window.__los.timeline() !== null, null, { timeout: 60000 })
  await atTime(30)
  await objective('burn numbers from the card')
  check(!(await page.evaluate(() => window.__los.focus())), 'the view was not turned')
  for (let i = 0; i < 3; i++) {
    await useAt('act1:dsky', 'KEY IN')
    await page.waitForTimeout(250)
    if (i === 2) break
  }
  await page.waitForTimeout(500)
  // DSKY close up: the eye 0.45 m in front of the keys, looking straight at them.
  await page.evaluate(() => {
    const d = window.__los.interactables().find((i) => i.id === 'act1:dsky').position
    window.__los.player.set({ pos: { x: d.x, y: d.y - 1.65, z: d.z + 0.45 }, yaw: 0, pitch: 0 })
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
  await page.waitForFunction(() => /all of Africa/.test(window.__los.store.getState().subtitle?.text ?? ''), null, { timeout: 30000, polling: 100 })
  check(!(await page.evaluate(() => window.__los.focus())), 'the view was not turned')
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
