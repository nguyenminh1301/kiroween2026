import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { gameUrl } from './url.mjs'

const plainUrl = gameUrl(null)
const debugUrl = gameUrl('?debug')
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots')
mkdirSync(shotDir, { recursive: true })
const shot = (page, name) => page.screenshot({ path: join(shotDir, `ui-${name}.png`) })

const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}
const TITLES = ['Pad 39A', 'Launch', 'Coast', 'Far side', 'Tranquility', 'Splashdown']

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return page
}
/** Act 0 opens on its chapter card. The pause menu shows only after the card has gone. */
const afterCard = async (page) => {
  await page.waitForSelector('[data-testid="card"]', { timeout: 30000 }).catch(() => {})
  await page.waitForSelector('[data-testid="card"]', { state: 'detached', timeout: 60000 })
}
const text = (page, sel) => page.locator(sel).first().textContent()
const lower = (s) => (s ?? '').toLowerCase()

try {
  // Without ?debug: one begin card, then the game. Settings and chapters sit in the Esc menu.
  const page = await newPage()
  await page.goto(plainUrl)
  await page.waitForSelector('[data-screen="begin"]')
  check(await page.evaluate(() => window.__los === undefined), 'no debug object without ?debug')
  check(lower(await text(page, '[data-screen="begin"]')).trim() === 'use headphones. click to begin.', 'begin card text')
  check((await page.locator('[data-screen="begin"] .btn, [data-screen="title"]').count()) === 0, 'no title menu')
  await shot(page, 'begin')
  await page.click('[data-screen="begin"]')
  await page.waitForSelector('[data-screen="begin"]', { state: 'detached' })
  await afterCard(page)
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"]')
  const items = (await page.locator('[data-screen="pause"] .btn').allTextContents()).map((t) => t.trim())
  check(
    JSON.stringify(items) === JSON.stringify(['Resume', 'Restart checkpoint', 'Chapters', 'Settings', 'Back to the article']),
    `pause menu items: ${items.join(' | ')}`,
  )
  await shot(page, 'pause-menu')
  await page.click('[data-screen="pause"] >> text=Chapters')
  const labels = await page.locator('[data-screen="pause"] .btn').allTextContents()
  check(labels.length === 7, `chapters has 6 acts and Back, got ${labels.length}`)
  TITLES.forEach((t, i) => check(lower(labels[i]).includes(lower(t)), `chapter ${i} is ${t}, got ${labels[i]}`))
  await page.click('[data-screen="pause"] >> text=Back')
  await page.click('[data-screen="pause"] >> text=Settings')
  await page.evaluate(() => {
    const el = document.querySelector('input[name="volume"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '0.5')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('loss-of-signal:v1') ?? '{}').settings?.volume === 0.5)
  await page.reload()
  await page.click('[data-screen="begin"]')
  await page.waitForSelector('[data-screen="begin"]', { state: 'detached' })
  await afterCard(page)
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"]')
  await page.click('[data-screen="pause"] >> text=Settings')
  check((await page.inputValue('input[name="volume"]')) === '0.5', 'volume 0.5 persisted after reload')
  await page.close()

  // With ?debug.
  const g = await newPage()
  await g.goto(debugUrl)
  await g.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await g.waitForFunction(() => window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, null, { timeout: 30000 })

  // 1. The first act loads.
  await g.evaluate(() => window.__los.loader.loadAct('act0-pad'))
  await g.waitForFunction(() => window.__los.store.getState().act === 'act0-pad', null, { timeout: 30000 })
  check(true, 'act0-pad began loading')

  // 2. Chapter card for act 1 at its first checkpoint, none for act 3 at wp1.
  await g.evaluate(() => window.__los.loader.loadAct('act1-launch'))
  await g.waitForSelector('[data-testid="card"]')
  check((await text(g, '[data-testid="card"]')).includes('July 16, 1969. Launch Complex 39A.'), 'card text for act 1')
  check(await g.evaluate(() => window.__los.store.getState().paused), 'game time stops during the card')
  await g.waitForTimeout(300)
  await shot(g, 'card')
  await g.evaluate(() => window.__los.loader.loadAct('act3-farside', 'wp1'))
  await g.waitForTimeout(500)
  check((await g.locator('[data-testid="card"]').count()) === 0, 'no card for act 3 at wp1')
  check(!(await g.evaluate(() => window.__los.store.getState().paused)), 'not paused after unloading a card')

  // 3. Sandbox: switch, objective, anomaly.
  await g.evaluate(async () => {
    await window.__los.loader.loadAct('sandbox')
    window.__los.ui.go('game')
    window.__los.store.setState({ anomaliesSeen: [] })
    window.__los.player.set({ pos: { x: 0, y: 0, z: -6.2 }, yaw: 0, pitch: 0 })
  })
  await g.waitForSelector('[data-testid="objective"]')
  check((await text(g, '[data-testid="objective"]')).includes('Flip the switch on the wall'), 'objective text')
  await g.waitForFunction(() => window.__los.store.getState().target?.id === 'switch', null, { timeout: 30000 })
  check((await g.locator('.dot-verb').count()) === 1, 'dot shows the verb')
  const ids = await g.evaluate(() => window.__los.interactables().map((i) => i.id))
  check(ids.includes('switch'), 'interactables() lists the switch')
  await g.waitForTimeout(800)
  await shot(g, 'objective')
  check(await g.evaluate(() => window.__los.sandbox.info().lightOn()), 'light starts on')
  await g.keyboard.press('KeyE')
  await g.waitForFunction(() => window.__los.sandbox.info().lightOn() === false, null, { timeout: 30000 })
  check(await g.evaluate(() => window.__los.store.getState().objective === null), 'objective cleared after the switch')
  await g.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0, z: 6 }, yaw: 0, pitch: 0 }))
  await g.waitForFunction(() => window.__los.store.getState().anomaliesSeen.includes('test-box'), null, { timeout: 30000 })
  check(true, 'test-box noticed')

  // 5. Dialogue box during test.capcom.
  await g.keyboard.press('Digit1')
  await g.waitForSelector('[data-testid="subtitle"]')
  await g.waitForTimeout(900)
  await shot(g, 'dialogue')
  await g.keyboard.press('Digit7')
  await g.keyboard.press('Digit8')
  await g.waitForSelector('[data-testid="dsky"]')
  await g.waitForTimeout(200)
  await shot(g, 'fx')

  // 4. Pause menu.
  await g.keyboard.press('Escape')
  await g.waitForSelector('[data-screen="pause"]')
  check(lower(await text(g, '[data-screen="pause"]')).includes('paused'), 'pause menu shows Paused')
  await shot(g, 'pause')
  // The button is the top element at its centre; click it through the DOM, since the page runs slowly on SwiftShader.
  await g.evaluate(() => document.querySelector('[data-screen="pause"] .btn').click())
  await g.waitForFunction(() => window.__los.store.getState().paused === false, null, { timeout: 30000 })
} catch (e) {
  errors.push(`script: ${e instanceof Error ? e.message : e}`)
} finally {
  await browser.close()
}

if (errors.length) {
  console.log(`errors:\n${errors.join('\n')}`)
  process.exit(1)
}
console.log('errors: none')
