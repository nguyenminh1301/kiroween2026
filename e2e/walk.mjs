// Act 0: walking must work while the opening lines play. Hold W from 2 s after load.
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
  await page.goto(url)
  await page.waitForFunction(() => window.__los?.loader.state.getState().status === 'ready', null, { timeout: 30000 })
  await page.evaluate(() => window.__los.loader.loadAct('act0-pad'))
  await page.waitForFunction(() => window.__los.loader.state.getState().act === 'act0-pad' && window.__los.player.body, null, { timeout: 30000 })
  await page.evaluate(() => window.__los.gameTime())
  const t0 = await page.evaluate(() => window.__los.gameTime())
  const start = await page.evaluate(() => ({ ...window.__los.player.body.pos }))
  await page.waitForFunction((t) => window.__los.gameTime() > t + 2, t0, { timeout: 30000, polling: 100 })
  await page.keyboard.down('KeyW')
  await page.waitForFunction((t) => window.__los.gameTime() > t + 6, t0, { timeout: 60000, polling: 100 })
  const end = await page.evaluate(() => ({ ...window.__los.player.body.pos }))
  await page.keyboard.up('KeyW')
  const moved = Math.hypot(end.x - start.x, end.z - start.z)
  check(moved >= 3, `moved ${moved.toFixed(2)} m by 6 s of game time, expected at least 3`)
  // A scripted look never lasts more than 1.5 s of game time.
  console.log(`moved ${moved.toFixed(2)} m`)
} catch (e) {
  errors.push(`script: ${e.message}`)
} finally {
  await browser.close()
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
