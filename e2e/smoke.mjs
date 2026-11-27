import { gameUrl } from './url.mjs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = gameUrl()
const here = dirname(fileURLToPath(import.meta.url))
const shotDir = join(here, 'shots')
mkdirSync(shotDir, { recursive: true })

const errors = []
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
  await page.waitForFunction(() => window.__los, null, { timeout: 30000 })

  const canvases = await page.locator('canvas').count()
  if (canvases < 1) errors.push('no <canvas> found')

  const webgl2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'))
  if (!webgl2) errors.push('WebGL2 is not available')

  await page.waitForTimeout(500)
  await page.screenshot({ path: join(shotDir, 'smoke.png') })
} catch (e) {
  errors.push(`smoke: ${e instanceof Error ? e.message : String(e)}`)
} finally {
  await browser.close()
}

if (errors.length) {
  console.log('errors:')
  for (const e of errors) console.log(`  ${e}`)
  process.exitCode = 1
} else {
  console.log('errors: none')
}
