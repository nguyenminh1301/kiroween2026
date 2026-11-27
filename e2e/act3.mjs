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
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  const shot = (name) => page.screenshot({ path: join(shotDir, `${name}.png`) })
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 })
  const objective = (text, timeout) =>
    wait((t) => window.__los.store.getState().objective?.text?.includes(t), text, timeout)
  const subtitle = (text, timeout) =>
    wait((t) => (window.__los.store.getState().subtitle?.text ?? '').includes(t), text, timeout)
  const unfocused = () => wait(() => !window.__los.focus(), null, 30000)
  const dir = () => page.evaluate(() => window.__los.director)
  const body = () => page.evaluate(() => ({ ...window.__los.player.body.pos }))
  const budget = async (label) => {
    const s = await page.evaluate(() => ({ calls: window.__los.stats.calls, tris: window.__los.stats.triangles }))
    check(s.calls > 0 && s.calls < 150, `${label}: draw calls ${s.calls}, expected under 150`)
    check(s.tris < 150000, `${label}: triangles ${s.tris}, expected under 150000`)
  }
  const load = async (cp) => {
    await page.evaluate((cp) => window.__los.loader.loadAct('act3-farside', cp), cp)
    await wait(() => window.__los.loader.state.getState().act === 'act3-farside' && window.__los.player.body && window.__los.director && window.__los.act3, null, 40000)
  }
  const frames = async () => {
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await wait((t) => window.__los.gameTime() > t + 0.2, t0, 30000)
  }
  const cp = () => page.evaluate(() => window.__los.store.getState().checkpoint)
  const teleport = (x, z, yaw = 0) =>
    page.evaluate(([x, z, yaw]) => window.__los.player.set({ pos: { x, y: 0.2, z }, yaw, pitch: 0 }), [x, z, yaw])
  // The creature patrols at random. Teleport only where it is not (8 m clear), so a script never walks into it.
  const go = async (x, z, yaw = 0) => {
    await wait(([x, z]) => {
      const p = window.__los.director.monster.pos
      return Math.hypot(p.x - x, p.z - z) > 8
    }, [x, z], 90000)
    await teleport(x, z, yaw)
  }
  const aim = (id) =>
    page.evaluate((id) => {
      const it = window.__los.interactables().find((i) => i.id === id)
      const b = window.__los.player.body
      const dx = it.position.x - b.pos.x
      const dy = it.position.y - (b.pos.y + 1.65)
      const dz = it.position.z - b.pos.z
      window.__los.player.set({ yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) })
    }, id)
  const useAt = async (id, verb) => {
    await unfocused()
    await aim(id)
    await wait((v) => window.__los.store.getState().target?.verb === v, verb, 30000)
    await page.keyboard.press('KeyE')
  }
  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  // 0. Caught: the swallow plays, then black, then the act restarts at the last checkpoint.
  await load('wp0')
  await wait(() => window.__los.act3.phase === 'explore', null, 40000)
  await frames()
  const mon = (await dir()).monster.pos
  await teleport(mon.x - 0.4, mon.z, Math.PI / 2)
  await wait(() => window.__los.act3.phase === 'caught', null, 30000)
  await page.waitForTimeout(450)
  await shot('act3-swallow')
  await wait(() => window.__los.act3.phase === 'explore' && window.__los.store.getState().checkpoint === 'wp0', null, 60000)
  await frames()

  // 1. Start: Buzz walks in the cabin, then the corridor to the junction, where the loops split.
  await load('start')
  await wait(() => window.__los.player.body.mode === 'walk', null, 30000)
  await objective('Find Neil and Mike', 40000)
  await page.waitForTimeout(800)
  await shot('act3-cabin')
  await budget('start')
  await go(0, -3.4)
  await frames()
  await go(0, -5.0)
  await wait(() => window.__los.store.getState().checkpoint === 'wp0', null, 30000)
  check((await cp()) === 'wp0', 'wp0 set at the junction')
  await shot('act3-junction')
  await budget('junction')

  // 1b. The straight way is blocked by the jammed hatch: walking into it stops short.
  await go(0, -9.2)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(1200)
  await page.keyboard.up('KeyW')
  check((await body()).z > -10.3, 'the hatch stops the player')
  await shot('act3-hatch')

  // 2. Hiding spots: a locker, behind an open door, in an empty bag. E to hide, E to come out.
  const hide = async (id, verb, x, z, yaw) => {
    await go(x, z, yaw)
    await frames()
    await useAt(id, verb)
    await wait(() => window.__los.store.getState().moveMode === 'seated', null, 30000)
    await page.waitForTimeout(700)
  }
  const leave = async () => {
    await page.waitForTimeout(500)
    await page.keyboard.press('KeyE')
    await wait(() => window.__los.store.getState().moveMode === 'walk', null, 30000)
  }
  await hide('act3:locker0', 'HIDE', -6.0, -11.0, -Math.PI / 2)
  await shot('act3-locker')
  await page.keyboard.down('Space')
  await page.waitForTimeout(800)
  await page.keyboard.up('Space')
  await leave()
  await hide('act3:corner0', 'HIDE', -9.9, -8.6, 0)
  await shot('act3-corner')
  await leave()
  await hide('act3:bag0', 'SLEEP', -10.6, -13.6, Math.PI / 2)
  check((await page.locator('[data-testid="slit"]').count()) === 1, 'the bag shows the dark view with a slit of light')
  await shot('act3-bag')
  await leave()
  check((await page.locator('[data-testid="slit"]').count()) === 0, 'the slit goes away outside the bag')

  // 3. The impostor, then the approach and the cage.
  await go(-6, -13.5)
  await frames()
  await go(-6, -14.6)
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('loss-of-signal'), null, 30000)
  await subtitle('how many crew aboard', 30000)
  await go(0, -26.5)
  await frames()
  await go(0, -28.8)
  await wait(() => window.__los.store.getState().checkpoint === 'wp1', null, 30000)
  await shot('act3-cage')
  await useAt('act3:cage', 'OPEN')
  await wait(() => window.__los.act3.phase === 'cageOpen', null, 30000)
  await go(-0.3, -30.6)
  await page.waitForTimeout(500)
  await shot('act3-hanging')
  await useAt('act3:cdr', 'TAKE')
  await objective('Carry him back')
  check((await page.evaluate(() => window.__los.act3.carrying)) === 'cdr', 'carrying Neil')
  check((await page.evaluate(() => window.__los.act3.carriedFirst)) === 'cdr', 'carriedFirst is Neil')
  await page.waitForTimeout(800)
  await shot('act3-carry')
  await budget('carry')
  await go(-0.4, 5.4)
  await useAt('act3:bags', 'LAY DOWN')
  await objective('Go back for the other one')
  check((await cp()) === 'wp2', 'wp2 set')

  // 4. Silent corridor, second crewman, swallow, wake in the bright cabin, choice.
  await teleport(0, -20)
  await frames()
  await teleport(0, -28.8)
  await wait(() => window.__los.store.getState().checkpoint === 'wp3', null, 30000)
  await teleport(0.3, -30.6)
  await useAt('act3:cmp', 'TAKE')
  await wait(() => window.__los.act3.phase === 'lunge', null, 30000)
  await page.waitForTimeout(450)
  await shot('act3-lunge')
  await wait(() => window.__los.act3.phase === 'wakeUp' || window.__los.act3.phase === 'choice', null, 30000)
  await page.waitForTimeout(1600)
  await shot('act3-wake')
  await wait(() => window.__los.act3.phase === 'choice', null, 90000)
  await shot('act3-choice')
  check((await page.evaluate(() => document.pointerLockElement)) === null, 'the pointer is free during the choice')
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-choice]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: innerWidth, h: innerHeight }
    }),
  )
  check(boxes.length === 2, 'both answers show')
  for (const r of boxes) check(r.top > r.h * 0.6 && r.bottom < r.h && r.left >= 0 && r.right <= r.w, 'an answer sits at the bottom of the screen')
  // The page runs slowly on SwiftShader, so move the mouse to the box centre instead of waiting for stable boxes.
  await page.mouse.move(5, 5)
  await page.waitForTimeout(1500)
  const fine = await page.evaluate(() => {
    const r = document.querySelector('[data-choice="fine"]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(fine.x, fine.y)
  await page.waitForTimeout(300)
  const onTop = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-choice]') ? 'choice' : `${el?.tagName}.${el?.className}`
  }, fine)
  check((await page.locator('[data-choice="fine"].marked').count()) === 1, `hover marks the answer (top element: ${onTop})`)

  // 5. Pause during the choice, then pick with a mouse click.
  await page.keyboard.press('Escape')
  await wait(() => window.__los.store.getState().paused === true, null, 30000)
  await page.waitForTimeout(1000)
  check((await page.evaluate(() => window.__los.act3.phase)) === 'choice', 'still in the choice after the pause')
  await page.evaluate(() => window.__los.lock.resume())
  await wait(() => window.__los.store.getState().paused === false, null, 30000)
  // A real mouse click: the pick asks for the pointer lock again, which needs a user gesture.
  const fine2 = await page.evaluate(() => {
    const r = document.querySelector('[data-choice="fine"]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.click(fine2.x, fine2.y)
  await wait(() => window.__los.store.getState().dreamChoice === 'fine', null, 30000)
  await wait(() => window.__los.loader.state.getState().act === 'act4-moon', null, 300000)
} catch (e) {
  errors.push(`script: ${e.message.split("\n")[0]} at ${(e.stack.match(/act3.mjs:(\d+)/g) ?? []).join(" ")}`)
  try {
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'act3-fail.png') })
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
