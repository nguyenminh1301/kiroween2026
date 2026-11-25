// Act 2: look straight down the tunnel and press E four times. Each press must push off.
import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
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
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 50 })
  await page.goto(url)
  await wait(() => window.__los?.loader.state.getState().status === 'ready', null, 30000)
  await page.evaluate(() => window.__los.loader.loadAct('act2-coast'))
  await wait(() => window.__los.loader.state.getState().act === 'act2-coast' && window.__los.player.body, null, 60000)
  await wait(() => !window.__los.focus(), null, 30000)
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: 0 }))
  const z0 = await page.evaluate(() => window.__los.player.body.pos.z)
  const dotRing = []
  for (let i = 0; i < 4; i++) {
    const t = await page.evaluate(() => window.__los.gameTime())
    dotRing.push(await page.evaluate(() => window.__los.store.getState().target?.verb ?? null))
    await page.keyboard.press('KeyE')
    await wait((t) => window.__los.gameTime() > t + 1.6, t, 30000)
    await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: 0 }))
  }
  const z1 = await page.evaluate(() => window.__los.player.body.pos.z)
  const moved = z0 - z1
  console.log(`moved ${moved.toFixed(2)} m toward the lander, targets ${JSON.stringify(dotRing)}`)
  check(moved >= 4, `moved ${moved.toFixed(2)} m toward the lander, expected at least 4`)
} catch (e) {
  errors.push(`script: ${e.message}`)
} finally {
  await browser.close()
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
