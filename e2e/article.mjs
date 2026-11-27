// The article page: loads, has every section and image, no console errors, no game code,
// marks show only after a run, the play links open the game, and it fits at four widths.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { articleUrl } from './url.mjs'

const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots')
mkdirSync(shotDir, { recursive: true })
const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}
const SECTIONS = ['crew', 'launch', 'landing', 'surface', 'orbit', 'home', 'what-really-happened', 'sources']
const WIDTHS = [375, 768, 1280, 1920]

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const open = async (width, height = 800) => {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return page
}
const loadAllImages = async (page) => {
  const n = await page.locator('img').count()
  for (let i = 0; i < n; i++) {
    await page.locator('img').nth(i).scrollIntoViewIfNeeded()
    await page.waitForFunction((k) => {
      const el = document.querySelectorAll('img')[k]
      return el.complete && el.naturalWidth > 0
    }, i, { timeout: 30000 })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

try {
  const page = await open(1280)
  const scripts = []
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url())
  })
  await page.goto(articleUrl())
  await page.waitForSelector('h1')
  for (const id of SECTIONS) check((await page.locator(`section#${id}`).count()) === 1, `section ${id}`)
  for (const id of SECTIONS) check((await page.locator(`.bar .sections a[href="#${id}"]`).count()) === 1, `bar link ${id}`)
  check((await page.locator('h1').textContent()).trim() === 'Eight Days to the Moon and Back', 'headline')
  check((await page.locator('.brand-name').textContent()).trim() === 'LOSS OF SIGNAL', 'brand name')
  check((await page.locator('.moment').count()) === 8, 'eight moments')
  check((await page.locator('#marks-note').isHidden()), 'no header line without a saved run')

  // All ten photos load in full, with size attributes, alt text and lazy loading (the hero loads at once).
  const imgs = await page.locator('img').count()
  check(imgs === 10, `ten photos, got ${imgs}`)
  for (let i = 0; i < imgs; i++) {
    const img = page.locator('img').nth(i)
    check(Boolean((await img.getAttribute('width')) && (await img.getAttribute('height')) && (await img.getAttribute('alt'))), `image ${i} attributes`)
    check((await img.getAttribute('loading')) === (i === 0 ? null : 'lazy'), `image ${i} loading`)
  }
  await loadAllImages(page)

  // No game code, no marks without a saved run, the bar stays on screen.
  check(scripts.every((u) => !/play-|three|react-dom|@react-three/i.test(u) && !/\/src\/(main\.tsx|app|render|acts|ui|interaction)\//.test(u)), `article scripts: ${scripts.join(', ')}`)
  check((await page.locator('.mark:not([hidden])').count()) === 0, 'no marks without a saved run')
  await page.evaluate(() => window.scrollTo(0, 3000))
  check(await page.locator('.bar .play').isVisible(), 'bar and play button stay visible while reading')
  check((await page.locator('.bar').boundingBox()).y === 0, 'bar stays at the top')

  // A saved run shows the marks and the count.
  await page.evaluate(() => {
    localStorage.setItem('loss-of-signal:v1', JSON.stringify({ played: true, seen: ['hornet', 'alarm-1202'] }))
  })
  await page.goto(articleUrl('what-really-happened'))
  await page.reload()
  await page.waitForSelector('.mark:not([hidden])')
  const marks = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.moment')].map((m) => [m.dataset.moment, m.querySelector('.mark').textContent])))
  check(marks.hornet === 'Seen in your flight' && marks['alarm-1202'] === 'Seen in your flight', 'seen marks')
  check(marks['escape-tower'] === 'Missed in your flight', 'missed mark')
  check((await page.locator('[data-moment="hornet"] .mark svg').count()) === 1, 'seen mark has a check')
  check((await page.locator('[data-moment="escape-tower"] .mark svg').count()) === 0, 'missed mark has no check')
  check((await page.locator('.mark:not([hidden])').count()) === 8, 'every moment is marked')
  check((await page.locator('#marks-note').textContent()).replace(/\s+/g, ' ').trim() === 'Your flight: 2 of 8 moments seen.', 'header line')
  await page.screenshot({ path: join(shotDir, 'article-marks.png') })
  await page.evaluate(() => localStorage.clear())

  // The three play links open the game window over the article, on the begin card.
  for (const sel of ['.bar .play', '.game .play', '.footer-play']) {
    await page.goto(articleUrl())
    await page.locator(sel).click()
    await page.waitForSelector('.gw iframe', { timeout: 30000 })
    if (sel === '.bar .play') {
      const frame = page.frameLocator('.gw iframe')
      await frame.locator('[data-screen="begin"]').waitFor({ timeout: 60000 })
      check((await frame.locator('[data-screen="begin"]').textContent()).includes('Click to begin'), 'game opens on the begin card')
    }
  }
  await page.close()

  // Four widths: screenshots, no sideways scroll, the bar and play button on screen.
  for (const width of WIDTHS) {
    const p = await open(width, width < 500 ? 800 : 900)
    await p.goto(articleUrl())
    await p.waitForSelector('h1')
    await loadAllImages(p)
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}: no sideways scroll`)
    check(await p.locator('.bar .play').isVisible(), `${width}: play button visible`)
    check((await p.locator('.bar').boundingBox()).height < (width < 500 ? 200 : 260), `${width}: bar stays short`)
    await p.screenshot({ path: join(shotDir, `article-${width}.png`), fullPage: true })
    if (width === 375) {
      const nav = await p.locator('.bar .sections').evaluate((el) => ({ scrolls: el.scrollWidth > el.clientWidth, wraps: el.getBoundingClientRect().height < 60 }))
      check(nav.scrolls && nav.wraps, '375: section links scroll sideways in one line')
      const rows = await p.evaluate(() => [...document.querySelectorAll('.photo-row')].map((r) => new Set([...r.children].map((c) => Math.round(c.getBoundingClientRect().left))).size))
      check(rows.every((n) => n === 1), '375: photo columns stack')
      await p.locator('.bar .sections a[href="#home"]').click()
      await p.waitForFunction(() => document.querySelector('#home').getBoundingClientRect().top < 300)
      check(await p.locator('.bar .play').isVisible(), '375: play button visible after jumping to a section')
    }
    await p.close()
  }
} catch (e) {
  errors.push(`script: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
} finally {
  await browser.close()
}

console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
