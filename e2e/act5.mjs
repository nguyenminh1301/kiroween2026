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
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  const shot = (name) => page.screenshot({ path: join(shotDir, `${name}.png`) })
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 50 })
  const tl = () => page.evaluate(() => window.__los.timeline())

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)
  await page.mouse.click(640, 360)
  await wait(() => window.__los.audio.loaded().length >= 40, null, 30000).catch(() => {})
  await page.evaluate(() => window.__los.loader.loadAct('act5-home'))
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' && window.__los.player.body, null, 40000)
  check(await page.evaluate(() => window.__los.player.body.mode === 'seated'), 'seated in the cabin')
  const start = await page.evaluate(() => {
    const s = window.__los.store.getState()
    return { tension: s.tension, hr: s.heartRate, fear: s.fear }
  })
  check(start.tension === 'UNEASE' && start.hr === 100 && Math.abs(start.fear - 0.2) < 0.01, `start state ${JSON.stringify(start)}`)

  // Screenshots every 9 s of timeline time, and a budget check on each.
  const sawLines = new Set()
  let maxCalls = 0
  let maxTris = 0
  for (let mark = 9; mark <= 63; mark += 9) {
    await wait((m) => (window.__los.timeline() ?? 999) >= m, mark, 120000)
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    maxCalls = Math.max(maxCalls, s.calls)
    maxTris = Math.max(maxTris, s.tris)
    await shot(`act5-t${String(mark).padStart(2, '0')}s`)
  }
  check(maxCalls < 150, `draw calls ${maxCalls}, expected under 150`)
  check(maxTris < 150000, `triangles ${maxTris}, expected under 150000`)

  // The narrator's ending line (subtitle only), then the fade.
  await wait(() => (window.__los.timeline() ?? 999) >= 62.2, null, 60000)
  await wait(() => window.__los.store.getState().subtitle?.text?.startsWith('July 24, 1969'), null, 30000)
  sawLines.add('act5.end')
  await wait(() => (window.__los.timeline() ?? 999) >= 70.8, null, 60000)
  await shot('act5-t72s')
  await wait(() => window.__los.store.getState().screen === 'archive', null, 30000)
  await page.waitForTimeout(500)
  await shot('act5-t81s')
  const count = await page.evaluate(() => document.querySelector('[data-testid=archive-count]')?.textContent ?? '')
  check(/Seen: \d \/ 8\./.test(count), `archive count text: ${count}`)
  check(await page.evaluate(() => window.__los.store.getState().finished), 'finished flag set')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('hornet')), 'hornet seen')

  // Quit to title mid-timeline: nothing more fires and every sound stops.
  await page.evaluate(() => {
    window.__los.ui.go('game')
    return window.__los.loader.loadAct('act5-home')
  })
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' && (window.__los.timeline() ?? 0) >= 14, null, 60000)
  await page.evaluate(() => window.__los.store.getState().setPaused(true))
  await page.getByRole('button', { name: 'Quit to title' }).click()
  await wait(() => window.__los.store.getState().screen === 'title', null, 30000)
  await page.waitForTimeout(3000)
  const after = await page.evaluate(() => ({
    playing: window.__los.audio.playing(),
    queue: window.__los.audio.radioQueue(),
    timeline: window.__los.timeline(),
    act: window.__los.loader.state.getState().act,
    sub: window.__los.store.getState().subtitle,
  }))
  check(after.playing.length === 0, `no sound after quit, got ${JSON.stringify(after.playing)}`)
  check(after.queue.length === 0 && after.timeline === null && after.act === null && !after.sub, `nothing runs after quit: ${JSON.stringify(after)}`)
} catch (e) {
  errors.push(`script: ${e.message.split('\n')[0]} at ${(e.stack.match(/act5.mjs:(\d+)/g) ?? []).join(' ')}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'act5-fail.png') })
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
