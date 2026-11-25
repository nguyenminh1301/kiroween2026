import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})

const ready = async (page) => {
  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 30000 })
  await page.waitForFunction(
    () => window.__los.loader.state.getState().status === 'ready' && window.__los.player.body,
    null,
    { timeout: 30000 },
  )
}
const subtitleText = (page) => page.evaluate(() => window.__los.store.getState().subtitle?.text ?? null)

try {
  // 1 to 3: the real files, radio line, pause holds the line.
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  await ready(page)
  await page.click('canvas')
  await page
    .waitForFunction(() => window.__los.audio.loaded().length >= 40, null, { timeout: 30000 })
    .catch(() => check(false, 'audio.loaded() reached 40 names within 10 s'))
  const playing = await page.evaluate(() => window.__los.audio.playing())
  check(playing.includes('hum'), `hum loop is playing, got ${JSON.stringify(playing)}`)

  await page.keyboard.press('Digit1')
  const queued = await page.evaluate(() => window.__los.audio.radioQueue())
  check(queued.includes('test.capcom'), `radioQueue has test.capcom, got ${JSON.stringify(queued)}`)
  check((await subtitleText(page)) === 'Columbia, Houston. Radio check.', 'subtitle text for test.capcom')
  await page.waitForFunction(() => window.__los.store.getState().subtitle === null, null, { timeout: 30000 })

  await page.keyboard.press('Digit1')
  await page.waitForFunction(() => window.__los.store.getState().subtitle !== null, null, { timeout: 30000 })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => window.__los.store.getState().paused === true, null, { timeout: 30000 })
  await page.waitForTimeout(4000)
  check((await subtitleText(page)) === 'Columbia, Houston. Radio check.', 'subtitle still showing 4 s into a pause')
  await page.evaluate(() => window.__los.lock.resume())
  await page
    .waitForFunction(() => window.__los.store.getState().subtitle === null, null, { timeout: 30000 })
    .catch(() => check(false, 'subtitle clears after resume'))

  // 4: every audio request blocked. No errors, subtitle still shows.
  const blocked = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  blocked.on('pageerror', (e) => errors.push(`pageerror (blocked): ${e.message}`))
  await blocked.route((u) => new URL(u).pathname.includes('/audio/'), (r) => r.abort())
  await ready(blocked)
  await blocked.click('canvas')
  for (const key of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) await blocked.keyboard.press(key)
  check((await subtitleText(blocked)) !== null, 'subtitle shows with audio blocked')
  const none = await blocked.evaluate(() => window.__los.audio.loaded().length)
  check(none === 0, `no names loaded with audio blocked, got ${none}`)
  await blocked.waitForTimeout(500)
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
