// The game window on the article page: both buttons open it, the iframe fills it, the page rots during an
// act 3 hunt and recovers, Close asks first during a run, Esc never closes it, and the end of a run
// closes it and scrolls to the marks. Run against the dev server (the end of the run imports an engine module).
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
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  const wait = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout })
  const game = () => page.frames().find((f) => f.url().includes('/play.html'))
  const gameReady = async () => {
    await wait(() => document.querySelector('.gw iframe'))
    for (let i = 0; i < 100 && !game(); i++) await page.waitForTimeout(100)
    await game().waitForFunction(() => window.__los && window.__los.loader.state.getState().status === 'ready', null, { timeout: 60000 })
    return game()
  }
  const htmlClass = () => page.evaluate(() => document.documentElement.className)

  await page.goto(articleUrl() + '?debug')
  await page.waitForSelector('h1')
  check(!(await htmlClass()).includes('rot'), 'the article alone shows no rot')
  await page.evaluate(() => localStorage.setItem('loss-of-signal:v1', JSON.stringify({ played: true, seen: ['hornet'] })))
  check((await page.locator('.rot-layer').count()) === 0, 'no rot layer on the article alone')

  // 1. Both buttons open the window. It is large, framed, 16:9, and the page behind is dimmed, inert and fixed.
  for (const sel of ['.bar .play', '.game .play']) {
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(1200)
    await page.locator(sel).click()
    await wait(() => document.querySelector('.gw iframe'))
    await page.waitForTimeout(1200)
    const y0 = await page.evaluate(() => window.scrollY)
    const box = await page.locator('.gw-panel').boundingBox()
    const fr = await page.locator('.gw iframe').boundingBox()
    check(box.width >= 1280 * 0.9 && box.height >= 800 * 0.9, `${sel}: window at least 90% (${box.width}x${box.height})`)
    check(Math.abs(fr.width / fr.height - 16 / 9) < 0.03 && fr.width >= 960 && fr.height >= 540, `${sel}: game area 16:9 and at least 960x540 (${fr.width}x${fr.height})`)
    check(fr.width >= box.width - 4, `${sel}: the iframe fills the window width`)
    const bar = await page.locator('.gw-bar').innerText()
    check(/LOSS OF SIGNAL/.test(bar) && /Full screen/.test(bar) && /Close/.test(bar), `${sel}: title bar text`)
    check((await page.locator('.gw iframe').getAttribute('allow')).includes('fullscreen'), `${sel}: iframe allows full screen`)
    check((await page.locator('main').getAttribute('inert')) !== null, `${sel}: article is inert`)
    await page.mouse.wheel(0, 800)
    await page.waitForTimeout(150)
    check((await page.evaluate(() => window.scrollY)) === y0, `${sel}: article does not scroll`)
    const f = await gameReady()
    check(await f.evaluate(() => window.location.pathname.endsWith('/play.html')), `${sel}: iframe is play.html`)
    if (sel === '.bar .play') await page.screenshot({ path: join(shotDir, 'window-open.png') })
    // Esc is the game's key. It never closes the window.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    check((await page.locator('.gw').count()) === 1, `${sel}: Esc does not close the window`)
    // No run yet: Close closes at once.
    await page.locator('.gw-close').first().click()
    await wait(() => !document.querySelector('.gw'))
    check((await page.locator('main').getAttribute('inert')) === null, `${sel}: article is live again`)
    check(!(await htmlClass()).includes('gw-open'), `${sel}: scroll lock released`)
  }

  // 2. Close during a run asks first.
  await page.locator('.bar .play').click()
  let f = await gameReady()
  await f.evaluate(() => window.__los.loader.loadAct('act0-pad'))
  await wait(() => document.querySelector('.gw-act')?.textContent === 'Pad 39A')
  await page.locator('.gw-close').first().click()
  check(await page.locator('.gw-confirm').isVisible(), 'Close asks for confirmation during a run')
  await page.locator('[data-keep]').click()
  check((await page.locator('.gw').count()) === 1 && !(await page.locator('.gw-confirm').isVisible()), 'Keep playing keeps the window')
  await page.locator('.gw-close').first().click()
  await page.getByRole('button', { name: 'Close the game' }).click()
  await wait(() => !document.querySelector('.gw'))

  // 3. The rot during act 3: appears with the dream, grows in a hunt, clears after the dream.
  await page.locator('.bar .play').click()
  f = await gameReady()
  await f.evaluate(() => window.__los.loader.loadAct('act3-farside', 'wp0'))
  await f.waitForFunction(() => window.__los.act3 && window.__los.act3.phase === 'explore' && window.__los.player.body, null, { timeout: 60000 })
  await wait(() => document.documentElement.classList.contains('rot'))
  const rotAt = () => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--rot')))
  await wait(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--rot')) > 0.4, null, 20000)
  await page.waitForTimeout(500)
  const calm = await rotAt()
  check(calm > 0.4 && calm < 0.6, `rot rests near 0.45 in the dream (${calm})`)
  check(!(await htmlClass()).includes('rot-hunt'), 'no hunt class while calm')
  check(await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgb(251, 249, 244)'), 'paper changed colour')
  await f.evaluate(() => window.__los.lock.markHeld())
  let hunted = false
  for (let i = 0; i < 40 && !hunted; i++) {
    const m = await f.evaluate(() => window.__los.director.monster)
    if (m.mode === 'hunt' || m.mode === 'alert') hunted = true
    else {
      await f.evaluate(([x, z]) => window.__los.player.set({ pos: { x: x + 5, y: 0.2, z }, yaw: 0, pitch: 0 }), [m.pos.x, m.pos.z])
      await page.keyboard.down('KeyW')
      await page.waitForTimeout(450)
      await page.keyboard.up('KeyW')
    }
  }
  check(hunted, 'the creature hunts the player')
  await wait(() => document.documentElement.classList.contains('rot-hunt'), null, 10000)
  await wait(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--rot')) > 0.9, null, 20000)
  const hot = await rotAt()
  check(hot > calm + 0.2, `rot grows in the hunt (${calm} to ${hot})`)
  await page.evaluate(() => {
    document.querySelector('.gw').style.display = 'none'
    window.scrollTo(0, 1400)
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shotDir, 'window-rot-page.png') })
  await page.evaluate(() => {
    document.querySelector('.gw').style.display = ''
  })
  // The dream ends when the next act starts.
  await f.evaluate(() => window.__los.loader.loadAct('act4-moon'))
  await wait(() => !document.documentElement.classList.contains('rot'), null, 20000)
  check(!(await htmlClass()).includes('rot'), 'rot clears after act 3')
  check((await page.evaluate(() => document.documentElement.style.getPropertyValue('--rot'))) === '', 'rot variable removed')

  // 4. The end of a run closes the window and scrolls to the marks.
  await f.evaluate(async () => {
    await window.__los.loader.loadAct('act5-home')
    const m = await import('/src/engine/actFlow.ts')
    m.completeAct()
  })
  await wait(() => !document.querySelector('.gw'), null, 30000)
  await wait(() => window.location.hash === '#what-really-happened')
  await page.waitForTimeout(800)
  const top = await page.evaluate(() => document.getElementById('what-really-happened').getBoundingClientRect().top)
  check(top >= -2 && top < 400, `scrolled to the marks (top ${Math.round(top)})`)
  check((await page.locator('.mark:not([hidden])').count()) === 8, 'marks refreshed from the save')
  check((await page.locator('[data-moment="hornet"] .mark').textContent()).includes('Seen'), 'a seen mark from the save')
  await page.screenshot({ path: join(shotDir, 'window-end.png') })
  await page.close()

  // 5. A phone gets the page full screen with a note.
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true })
  await phone.goto(articleUrl())
  await phone.locator('.bar .play').click()
  check(await phone.locator('.gw-note').isVisible(), 'phone note shown')
  await phone.waitForURL(/\/play\.html/, { timeout: 15000 })
  await phone.close()
} catch (e) {
  errors.push(`script: ${e instanceof Error ? e.message.split('\n')[0] : e}`)
} finally {
  await browser.close()
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'errors: none')
process.exit(errors.length ? 1 : 0)
