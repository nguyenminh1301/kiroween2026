import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
const here = dirname(fileURLToPath(import.meta.url))
const shotDir = join(here, 'shots')
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  await page.goto(url)
  await page.waitForFunction(() => window.__los, null, { timeout: 15000 })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, null, {
    timeout: 20000,
  })
  await page.waitForTimeout(300)

  const pos = () => page.evaluate(() => ({ ...window.__los.player.body.pos }))
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)

  // (1) Hold KeyW for 2 s.
  const info = await page.evaluate(() => {
    const i = window.__los.sandbox.info()
    return { wallInnerZ: i.wallInnerZ, zone: i.zeroGZone }
  })
  const p0 = await pos()
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(2000)
  await page.keyboard.up('KeyW')
  await page.waitForTimeout(150)
  const p1 = await pos()
  const walked = dist(p0, p1)
  check(walked >= 2 && walked <= 3.5, `walked ${walked.toFixed(2)} m in 2 s, expected 2 to 3.5`)
  check(p1.z < p0.z && p1.z > info.wallInnerZ, 'forward movement did not stay inside the wall')

  // (2) Walk into the north wall.
  await page.keyboard.down('KeyW')
  await page.waitForFunction(
    (z) => window.__los.player.body.pos.z < z + 0.6,
    info.wallInnerZ,
    { timeout: 30000, polling: 100 },
  ).catch(() => {})
  await page.waitForTimeout(1000)
  await page.keyboard.up('KeyW')
  const p2 = await pos()
  check(p2.z >= info.wallInnerZ, `crossed the wall: z=${p2.z.toFixed(2)} < ${info.wallInnerZ}`)
  check(p2.z - info.wallInnerZ < 1, `did not reach the wall: z=${p2.z.toFixed(2)}`)
  await page.waitForTimeout(500)
  const p3 = await pos()
  check(Math.abs(p3.z - p2.z) < 0.02, 'player kept moving at the wall')

  // (3) Zero-g launch.
  const zc = {
    x: (info.zone.min.x + info.zone.max.x) / 2 + 1,
    z: (info.zone.min.z + info.zone.max.z) / 2,
  }
  await page.evaluate((c) => window.__los.player.set({ pos: { x: c.x, y: 1.2, z: c.z } }), zc)
  await page.waitForFunction(() => window.__los.store.getState().moveMode === 'zeroG', null, { timeout: 5000 })
  const z0 = await pos()
  await page.evaluate(() => window.__los.player.launch({ x: -1, y: 0, z: 0 }))
  await page.waitForTimeout(6000)
  const z1 = await pos()
  const speed = await page.evaluate(() => Math.hypot(...Object.values(window.__los.player.body.vel)))
  const drift = dist(z0, z1)
  check(drift >= 1.2 && drift <= 1.8, `drift ${drift.toFixed(2)} m, expected 1.2 to 1.8`)
  check(speed < 0.02, `still moving after drift: ${speed.toFixed(3)} m/s`)
  await page.waitForTimeout(500)
  check(dist(z1, await pos()) < 0.02, 'player not at rest after drift')

  // (4) Pause on lock loss, timeline frozen, then resume.
  await page.keyboard.press('KeyT')
  await page.waitForFunction(() => window.__los.sandbox.timelineTime() !== null, null, { timeout: 5000 })
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    window.__los.lock.markHeld(true)
    document.dispatchEvent(new Event('pointerlockchange'))
  })
  await page.waitForFunction(() => window.__los.store.getState().paused === true, null, { timeout: 5000 })
  const t0 = await page.evaluate(() => window.__los.sandbox.timelineTime())
  await page.waitForTimeout(1000)
  const t1 = await page.evaluate(() => window.__los.sandbox.timelineTime())
  check(t0 !== null && t0 === t1, `timeline moved while paused: ${t0} -> ${t1}`)
  await page.evaluate(() => window.__los.lock.resume())
  const paused = await page.evaluate(() => window.__los.store.getState().paused)
  check(paused === false, 'resume did not unpause')
  await page.waitForTimeout(800)
  const t2 = await page.evaluate(() => window.__los.sandbox.timelineTime())
  check(t2 !== null && t0 !== null && t2 > t0 + 0.2, `timeline did not advance after resume: ${t0} -> ${t2}`)

  // (5) Two quick loads leave one sandbox.
  await page.evaluate(async () => {
    const a = window.__los.loader.loadAct('sandbox')
    const b = window.__los.loader.loadAct('sandbox')
    await Promise.all([a, b])
  })
  await page.waitForFunction(() => window.__los.loader.state.getState().status === 'ready', null, { timeout: 20000 })
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => ({
    instances: window.__los.sandbox.instances(),
    status: window.__los.loader.state.getState().status,
  }))
  check(after.instances === 1, `sandbox instances: ${after.instances}`)
  check(after.status === 'ready', `status: ${after.status}`)

  await page.screenshot({ path: join(shotDir, 'engine.png') })
} catch (e) {
  errors.push(`engine: ${e instanceof Error ? e.message : String(e)}`)
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
