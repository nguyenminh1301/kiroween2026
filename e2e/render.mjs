import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
const here = dirname(fileURLToPath(import.meta.url))
const shotDir = join(here, 'shots')
mkdirSync(shotDir, { recursive: true })

const errors = []
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

/** Resolves when the canvas buffer has held the given size for 5 animation frames in a row. */
const settled = (page, w, h) =>
  page.evaluate(
    ([w, h]) =>
      new Promise((resolve) => {
        let ok = 0
        const tick = () => {
          const c = document.querySelector('canvas')
          ok = c.width === w && c.height === h ? ok + 1 : 0
          if (ok >= 5) resolve(true)
          else requestAnimationFrame(tick)
        }
        tick()
      }),
    [w, h],
  )

const bufferSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height) }
  })

/** Distinct values per channel in a PNG buffer, decoded in the page. Skips the top 40 px (stats box). */
const channelValues = (page, png) =>
  page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 40, img.width, img.height - 40)
    const sets = [new Set(), new Set(), new Set()]
    for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) sets[k].add(data[i + k])
    return sets.map((s) => s.size)
  }, png.toString('base64'))

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 15000 })
  await page.evaluate(() => window.__los.loader.loadAct('sandbox'))
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 15000 })

  await page.evaluate(() => {
    window.__los.render.setLevel(1)
    window.__los.render.auto(false)
  })
  await settled(page, 640, 360)

  const b1 = await bufferSize(page)
  if (b1.w !== 640 || b1.h !== 360) errors.push(`buffer ${b1.w}x${b1.h}, expected 640x360`)
  if (b1.cssW !== 1280 || b1.cssH !== 720) errors.push(`css ${b1.cssW}x${b1.cssH}, expected 1280x720`)

  const shot = await page.screenshot()
  const counts = await channelValues(page, shot)
  if (counts.some((n) => n > 70)) errors.push(`channel values ${counts.join(',')}, expected at most 70 each`)

  await page.evaluate(() => window.__los.render.setLevel(3))
  await settled(page, 320, 180)
  const b3 = await bufferSize(page)
  if (b3.w !== 320 || b3.h !== 180) errors.push(`buffer ${b3.w}x${b3.h}, expected 320x180`)

  await page.evaluate(() => window.__los.render.auto(true))

  const stats = await page.evaluate(() => ({ calls: window.__los.stats.calls, triangles: window.__los.stats.triangles }))
  if (!(stats.calls < 150)) errors.push(`calls ${stats.calls}, expected under 150`)
  if (!(stats.triangles < 150000)) errors.push(`triangles ${stats.triangles}, expected under 150000`)

  await page.evaluate(() => window.__los.store.getState().setFear(1))
  await page.waitForFunction(() => window.__los.store.getState().fear === 1)
  await page.screenshot({ path: join(shotDir, 'render-fear.png') })
  await page.evaluate(() => window.__los.store.getState().setFear(0))
  await page.waitForFunction(() => window.__los.store.getState().fear === 0)
  await page.screenshot({ path: join(shotDir, 'render.png') })
} catch (e) {
  errors.push(`render: ${e instanceof Error ? e.message : String(e)}`)
} finally {
  await browser.close()
}

if (errors.length === 0) {
  console.log('errors: none')
} else {
  console.log('errors:')
  for (const e of errors) console.log(`  ${e}`)
  process.exit(1)
}
