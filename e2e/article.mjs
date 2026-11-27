// The article page: loads, has every section and image, no console errors, no game code,
// marks show only after a run, the narrow menu works, and the button opens the game.
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
const SECTIONS = ['the-crew', 'launch', 'three-days-out', 'the-landing', 'on-the-surface', 'alone-in-orbit', 'coming-home', 'what-really-happened', 'sources']

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const open = async (width) => {
  const page = await browser.newPage({ viewport: { width, height: 800 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return page
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
  check((await page.locator('h1').textContent()).length > 10, 'headline')
  check((await page.locator('.masthead').textContent()).trim() === 'LOSS OF SIGNAL', 'masthead')

  // Every image loads in full, with its size attributes. Lazy images load when scrolled to.
  const imgs = await page.locator('img').count()
  check(imgs === 10, `ten photos, got ${imgs}`)
  for (let i = 0; i < imgs; i++) {
    const img = page.locator('img').nth(i)
    await img.scrollIntoViewIfNeeded()
    await page.waitForFunction((n) => {
      const el = document.querySelectorAll('img')[n]
      return el.complete && el.naturalWidth > 0
    }, i, { timeout: 30000 })
    check((await img.getAttribute('loading')) === 'lazy' && (await img.getAttribute('width')) && (await img.getAttribute('height')), `image ${i} attributes`)
  }
  await page.evaluate(() => window.scrollTo(0, 0))

  // No game code, no marks without a saved run, the bar stays on screen.
  check(scripts.every((u) => !/play-|three|react-dom|@react-three/i.test(u) && !/\/src\/(main\.tsx|app|render|acts|ui|interaction)\//.test(u)), `article scripts: ${scripts.join(', ')}`)
  check((await page.locator('.mark:not([hidden])').count()) === 0, 'no marks without a saved run')
  await page.evaluate(() => window.scrollTo(0, 3000))
  check(await page.locator('.bar .play').isVisible(), 'bar and play button stay visible while reading')
  check((await page.locator('.bar').boundingBox()).y === 0, 'bar stays at the top')
  await page.screenshot({ path: join(shotDir, 'article-wide.png') })

  // A saved run shows the marks.
  await page.evaluate(() => {
    localStorage.setItem('loss-of-signal:v1', JSON.stringify({ played: true, seen: ['hornet', 'alarm-1202'] }))
  })
  await page.goto(articleUrl('what-really-happened'))
  await page.reload()
  await page.waitForSelector('.mark:not([hidden])')
  const marks = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.moment')].map((m) => [m.dataset.moment, m.querySelector('.mark').textContent])))
  check(marks.hornet === 'Seen in your flight' && marks['alarm-1202'] === 'Seen in your flight', 'seen marks')
  check(marks['escape-tower'] === 'Missed in your flight', 'missed mark')
  await page.screenshot({ path: join(shotDir, 'article-marks.png') })
  await page.evaluate(() => localStorage.clear())

  // The button opens the game on the begin card.
  await page.goto(articleUrl())
  await page.locator('.bar .play').click()
  await page.waitForURL(/\/play\.html/, { timeout: 30000 })
  await page.waitForSelector('[data-screen="begin"]', { timeout: 30000 })
  check((await page.locator('[data-screen="begin"]').textContent()).includes('Click to begin'), 'game opens on the begin card')
  await page.close()

  // The closing button too.
  const closing = await open(1280)
  await closing.goto(articleUrl())
  await closing.locator('.closing .play.big').click()
  await closing.waitForURL(/\/play\.html/, { timeout: 30000 })
  await closing.close()

  // Narrow: the links fold into a menu, the button stays.
  const narrow = await open(390)
  await narrow.goto(articleUrl())
  await narrow.waitForSelector('h1')
  check(await narrow.locator('.bar .play').isVisible(), 'narrow: play button visible')
  check(!(await narrow.locator('#section-links').isVisible()), 'narrow: links folded')
  await narrow.locator('.menu-toggle').click()
  check(await narrow.locator('#section-links').isVisible(), 'narrow: menu opens')
  await narrow.screenshot({ path: join(shotDir, 'article-narrow-menu.png') })
  await narrow.locator('#section-links a', { hasText: 'Coming home' }).click()
  check(!(await narrow.locator('#section-links').isVisible()), 'narrow: menu closes after a choice')
  check((await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), 'narrow: no sideways scroll')
} catch (e) {
  errors.push(`script: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
} finally {
  await browser.close()
}

console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
