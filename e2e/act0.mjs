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
  const state = () => page.evaluate(() => {
    const s = window.__los.store.getState()
    return { act: s.act, objective: s.objective?.text ?? null, verb: s.target?.verb ?? null, seen: s.anomaliesSeen, sub: s.subtitle?.text ?? null }
  })

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 30000 })
  await page.evaluate(() => window.__los.loader.loadAct('act0-pad'))
  await page.waitForFunction(
    () => window.__los.loader.state.getState().act === 'act0-pad' && window.__los.player.body,
    null,
    { timeout: 30000 },
  )

  // Start view and budget.
  await page.waitForTimeout(500)
  const stats = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
  check(stats.calls > 0 && stats.calls < 150, `draw calls ${stats.calls}, expected under 150`)
  check(stats.tris < 150000, `triangles ${stats.tris}, expected under 150000`)
  await shot('act0-start')

  // Wait for the narrator and Gunter to finish and the wave objective to appear.
  await page.waitForFunction(() => window.__los.store.getState().objective?.text?.includes('wave'), null, { timeout: 90000 })
  check(!(await page.evaluate(() => window.__los.focus())), 'the view never turns by itself')

  // Look down over the right railing: the target must be WAVE.
  await page.evaluate(() => window.__los.player.set({ yaw: -1.2, pitch: -0.5 }))
  await page.waitForFunction(() => window.__los.store.getState().target?.verb === 'WAVE', null, { timeout: 30000 })
  check((await state()).verb === 'WAVE', 'looking down over the railing targets WAVE')
  await page.keyboard.press('KeyE')
  await page.waitForFunction(() => window.__los.store.getState().objective?.text?.includes('White Room'), null, { timeout: 30000 })
  await page.waitForTimeout(600)
  await shot('act0-wave')

  // Walk to the White Room with real key presses.
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: 0 }))
  await page.keyboard.down('KeyW')
  await page.waitForFunction(() => window.__los.player.body.pos.z < -7.2, null, { timeout: 40000, polling: 100 })
  await page.keyboard.up('KeyW')
  // Walking past the crew said nothing and never turned the view.
  check(!(await page.evaluate(() => window.__los.focus())), 'walking past the crew does not turn the view')
  check(!/middle couch/.test((await state()).sub ?? ''), 'Gunter does not speak until talked to')
  // Look at Gunter and talk: verb TALK, then his line.
  await page.evaluate(() => window.__los.player.set({ yaw: -0.73, pitch: -0.2 }))
  await page.waitForFunction(() => window.__los.store.getState().target?.verb === 'TALK', null, { timeout: 30000 })
  await page.keyboard.press('KeyE')
  await page.waitForFunction(() => /middle couch/.test(window.__los.store.getState().subtitle?.text ?? ''), null, { timeout: 40000, polling: 100 })
  await shot('act0-room')

  // Aim at the hatch and board.
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: -0.1 }))
  await page.waitForFunction(() => window.__los.store.getState().target?.verb === 'GRAB', null, { timeout: 30000 })
  await page.keyboard.press('KeyE')
  await page.waitForFunction(() => window.__los.store.getState().act === 'act1-launch', null, { timeout: 60000, polling: 200 })
  check(true, 'act1 loaded')
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
