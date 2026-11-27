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
  await page.evaluate(() => {
    window.__los.store.getState().setPlayed(true)
    return window.__los.loader.loadAct('act5-home')
  })
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' && window.__los.player.body, null, 40000)
  check(await page.evaluate(() => window.__los.player.body.mode === 'seated'), 'seated in the cabin')
  const start = await page.evaluate(() => {
    const s = window.__los.store.getState()
    return { tension: s.tension, hr: s.heartRate, fear: s.fear }
  })
  check(start.tension === 'UNEASE' && start.hr === 100 && Math.abs(start.fear - 0.2) < 0.01, `start state ${JSON.stringify(start)}`)

  // Cabin views at the start of each cabin moment (2, 13, 27 s) and during blackout (17 s). Screenshots at the re-entry peak and fade, the reefed and open drogues, the reefed and open mains, then every 9 s. A budget check on each.
  const sawLines = new Set()
  let maxCalls = 0
  let maxTris = 0
  for (const mark of [2, 8.5, 11.5, 13, 17, 22.8, 27, 25, 29.8, 34, 36.5, 45, 49, 54, 63]) {
    await wait((m) => (window.__los.timeline() ?? 999) >= m, mark, 120000)
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    maxCalls = Math.max(maxCalls, s.calls)
    maxTris = Math.max(maxTris, s.tris)
    await shot(`act5-t${String(mark).replace('.', '_').padStart(2, '0')}s`)
    if (mark === 49) check((await page.evaluate(() => document.querySelector('[data-testid=print]')?.textContent ?? '')).includes('S69-21698'), 'raft print shows after splashdown')
  }
  check(maxCalls < 150, `draw calls ${maxCalls}, expected under 150`)
  check(maxTris < 150000, `triangles ${maxTris}, expected under 150000`)

  // The narrator's ending line (subtitle only), then the fade.
  await wait(() => (window.__los.timeline() ?? 999) >= 62.2, null, 60000)
  await wait(() => window.__los.store.getState().subtitle?.text?.startsWith('July 24, 1969'), null, 30000)
  sawLines.add('act5.end')
  // The last two prints follow the narrator: the walk to the quarantine trailer, then the trailer.
  const printText = () => page.evaluate(() => document.querySelector('[data-testid=print]')?.textContent ?? '')
  await wait(() => (window.__los.timeline() ?? 999) >= 73, null, 60000)
  check((await printText()).includes('S69-40753'), 'quarantine walk print shows after the narrator')
  await shot('act5-t72s')
  // Sample the walk print every frame while it slides out and the trailer print takes over. It must stay at its own
  // size (never wider than its slot) and no full screen overlay (the leaving fade, the photo flash) may appear.
  await page.evaluate(() => {
    const out = (window.__printSamples = [])
    const tick = () => {
      const e = document.querySelector('.print')
      const slot = document.querySelector('.print-slot')
      if (e && slot) {
        const r = e.getBoundingClientRect()
        out.push({
          w: r.width,
          slot: slot.getBoundingClientRect().width,
          out: e.className.includes('leaving'),
          overlay: !!document.querySelector('.leaving, .fx-photo-flash, .fx-print'),
        })
      }
      window.__printRaf = requestAnimationFrame(tick)
    }
    tick()
  })
  await wait(() => (window.__los.timeline() ?? 999) >= 82, null, 60000)
  check((await printText()).includes('KSC-69PC-484'), 'quarantine trailer print shows')
  const samples = await page.evaluate(() => {
    cancelAnimationFrame(window.__printRaf)
    return window.__printSamples
  })
  const slides = samples.filter((x) => x.out)
  check(slides.length >= 3, `the print was sampled ${slides.length} times while sliding out, expected at least 3`)
  const widest = Math.max(...samples.map((x) => x.w / x.slot))
  check(widest <= 1.2, `a print grew to ${widest.toFixed(2)} times its slot width while sliding out`)
  check(!samples.some((x) => x.overlay), 'a full screen overlay appeared while a print was sliding out')
  await wait(() => window.__los.store.getState().screen === 'leaving', null, 30000)
  await page.waitForTimeout(500)
  await shot('act5-t81s')
  check(await page.evaluate(() => window.__los.store.getState().finished), 'finished flag set')
  check(await page.evaluate(() => window.__los.store.getState().anomaliesSeen.includes('hornet')), 'hornet seen')
  // The end fade, then the article at "What really happened". The save has the run, so the Hornet item is marked.
  await page.waitForURL(/#what-really-happened$/, { timeout: 30000 })
  await page.waitForSelector('.moment .mark:not([hidden])', { timeout: 30000 })
  const hornet = await page.locator('[data-moment="hornet"] .mark').textContent()
  check(hornet === 'Seen in your flight', `hornet mark in the article: ${hornet}`)

  // "Back to the article" in the Esc menu leaves the game page.
  await page.goto(url)
  await wait(() => window.__los?.loader.state.getState().status === 'ready', null, 30000)
  await page.evaluate(() => {
    window.__los.ui.go('game')
    return window.__los.loader.loadAct('act5-home')
  })
  await wait(() => window.__los.loader.state.getState().act === 'act5-home' && (window.__los.timeline() ?? 0) >= 14, null, 60000)
  await page.evaluate(() => window.__los.store.getState().setPaused(true))
  await page.getByRole('button', { name: 'Back to the article' }).click()
  await page.waitForURL((u) => u.pathname === '/' || u.pathname.endsWith('/index.html'), { timeout: 30000 })
  check(await page.locator('h1').first().isVisible(), 'article page is open after Back to the article')
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
