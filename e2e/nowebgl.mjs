// No WebGL: the page must show the no-WebGL message, with no uncaught error and no blank page.
// Run against the dev server without ?debug, so the real screens show.
import { chromium } from 'playwright'
import { gameUrl } from './url.mjs'

const url = gameUrl(null)
const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
// React in dev mode re-reports a caught render error to window.onerror. The production build does not,
// so against a dev server that one known message is ignored. A built `vite preview` must be silent.
const isDev = (await fetch(new URL('/@vite/client', url)).catch(() => null))?.ok === true
async function run(label, target) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => {
    if (isDev && /Error creating WebGL context/.test(e.message)) return
    errors.push(`${label} pageerror: ${e.message}`)
  })
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return real.call(this, type, ...rest)
    }
  })
  await page.goto(target)
  await page.waitForTimeout(2500)
  const text = await page.evaluate(() => document.body.innerText)
  check(/this browser cannot run the game/i.test(text), `${label}: no-WebGL message shows, page text: ${text.slice(0, 80)}`)
  await page.close()
}
try {
  await run('plain', url)
  await run('debug', url + '?debug')
} catch (e) {
  errors.push(`script: ${e.message}`)
} finally {
  await browser.close()
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
