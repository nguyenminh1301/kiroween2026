import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const base = new URL(process.env.GAME_URL ?? 'http://localhost:5173/?debug')
const plainUrl = `${base.origin}/`
const debugUrl = `${base.origin}/?debug`
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
const text = (page, sel) => page.locator(sel).first().textContent()
const lower = (s) => (s ?? '').toLowerCase()

try {
  // Without ?debug: the screen flow.
  const page = await newPage()
  await page.goto(plainUrl)
  await page.waitForSelector('[data-screen="warning"]')
  check(await page.evaluate(() => window.__los === undefined), 'no debug object without ?debug')
  await page.click('text=Continue')
  await page.click('text=Click to start')
  await page.waitForSelector('[data-screen="title"]')
  check(lower(await text(page, '[data-screen="title"] h1')).includes('loss of signal'), 'title shows LOSS OF SIGNAL')
  check((await page.locator('[data-screen="title"] .btn').count()) === 4, 'title has 4 buttons before act 5 is finished')
  await page.click('text=Chapters')
  await page.waitForSelector('[data-screen="chapters"]')
  const labels = await page.locator('[data-screen="chapters"] .btn').allTextContents()
  check(labels.length === 7, `chapters has 6 acts and Back, got ${labels.length}`)
  TITLES.forEach((t, i) => check(lower(labels[i]).includes(lower(t)), `chapter ${i} is ${t}, got ${labels[i]}`))
  await page.click('text=Back')
  await page.click('text=Settings')
  await page.waitForSelector('[data-screen="settings"]')
  await page.evaluate(() => {
    const el = document.querySelector('input[name="volume"]')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '0.5')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('loss-of-signal:v1') ?? '{}').settings?.volume === 0.5)
  await page.reload()
  await page.click('text=Continue')
  await page.click('text=Click to start')
  await page.click('text=Settings')
  check((await page.inputValue('input[name="volume"]')) === '0.5', 'volume 0.5 persisted after reload')
  await page.close()

  // With ?debug.
  const g = await newPage()
  await g.goto(debugUrl)
  await g.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await g.waitForFunction(() => window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, null, { timeout: 30000 })

  // 1. Title, Start loads act0-pad.
  await g.evaluate(() => window.__los.ui.go('title'))
  await g.waitForSelector('[data-screen="title"]')
  await shot(g, 'title')
  await g.evaluate(() => window.__los.ui.go('chapters'))
  await g.waitForSelector('[data-screen="chapters"]')
  await shot(g, 'chapters')
  await g.evaluate(() => window.__los.ui.go('settings'))
  await g.waitForSelector('[data-screen="settings"]')
  await shot(g, 'settings')
  await g.evaluate(() => window.__los.ui.go('title'))
  await g.click('text=Start')
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

  // Archive.
  await g.evaluate(() => {
    window.__los.store.setState({ anomaliesSeen: ['o2-for-four', 'fourth-sleeper', 'burn-baby-burn', 'test-box'] })
    window.__los.ui.go('archive')
  })
  await g.waitForSelector('[data-screen="archive"]')
  check((await text(g, '[data-testid="archive-count"]')).includes('3 / 6'), 'archive counts 3 of 6')
  check((await g.locator('[data-anomaly]').count()) === 6, 'archive lists six items')
  await shot(g, 'archive')
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
