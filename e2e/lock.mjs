// Pointer lock must survive the chapter card. Start from the begin card, finish act 0, and check act 1.
import { gameUrl } from './url.mjs'
import { chromium } from 'playwright'

const url = gameUrl()
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
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 })
  const locked = () => page.evaluate(() => document.pointerLockElement !== null)
  await page.goto(url)
  await wait(() => window.__los?.loader.state.getState().status === 'ready', null, 30000)
  await page.evaluate(() => window.__los.ui.go('begin'))
  await page.waitForSelector('[data-screen="begin"]')
  await page.click('[data-screen="begin"]')
  await wait(() => window.__los.loader.state.getState().act === 'act0-pad' && window.__los.player.body, null, 120000)
  await wait(() => document.pointerLockElement !== null, null, 10000)
  check(await locked(), 'lock held in act 0')

  // Walk the normal way: wave, then board.
  await wait(() => window.__los.store.getState().objective?.text?.includes('wave'), null, 90000)
  await wait(() => !window.__los.focus(), null, 30000)
  await page.evaluate(() => window.__los.player.set({ yaw: -1.2, pitch: -0.5 }))
  await wait(() => window.__los.store.getState().target?.verb === 'WAVE', null, 30000)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().objective?.text?.includes('White Room'), null, 10000)
  await wait(() => !window.__los.focus(), null, 30000)
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: 0 }))
  await page.keyboard.down('KeyW')
  await wait(() => window.__los.player.body.pos.z < -7.2, null, 40000)
  await page.keyboard.up('KeyW')
  await wait(() => !window.__los.focus(), null, 30000)
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: -0.1 }))
  await wait(() => window.__los.store.getState().target?.verb === 'GRAB', null, 30000)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().act === 'act1-launch', null, 60000)
  // During and after the card.
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 60000)
  check(await locked(), 'lock held right after act 1 loads')
  await wait(() => !window.__los.store.getState().paused, null, 30000)
  await page.waitForTimeout(500)
  const held = await locked()
  const prompt = (await page.locator('[data-lock-prompt]').count()) > 0
  check(held || prompt, `after the card: lock held ${held}, prompt shown ${prompt}`)
  check(held, 'lock still held in act 1 after the card')
  check(!prompt || !held, 'no prompt while the lock is held')

  // Lose the lock for another reason: the game pauses, Resume takes the lock back.
  await page.evaluate(() => document.exitPointerLock())
  await wait(() => window.__los.store.getState().paused, null, 10000)
  await page.click('text=Resume')
  await wait(() => document.pointerLockElement !== null && !window.__los.store.getState().paused, null, 10000)
  check(await locked(), 'Resume takes the lock back')
} catch (e) {
  errors.push(`script: ${e.message}`)
} finally {
  await browser.close()
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
