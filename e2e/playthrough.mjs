// The full-game check: title screen, Start, every act in order with the same steps as the act
// scripts (teleports only where those scripts teleport), then the Archive with all six noticed.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const url = process.env.GAME_URL ?? 'http://localhost:5173/?debug'
const shotDir = join(dirname(fileURLToPath(import.meta.url)), 'shots')
mkdirSync(shotDir, { recursive: true })

const ALL = ['extra-bootprints', 'o2-for-four', 'tunnel-longer', 'fourth-sleeper', 'impostor-capcom', 'burn-baby-burn']
const errors = []
const check = (ok, msg) => {
  if (!ok) errors.push(`check failed: ${msg}`)
}

// BLOCK_AUDIO=1 aborts every /audio/ request: the whole game must still finish, with subtitles only.
const blockAudio = process.env.BLOCK_AUDIO === '1'
let blockedRequests = 0
// Stats samples: { act, calls, tris }, one every few seconds during the run.
const samples = []

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

let stage = 'boot'
let sampler = null
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    if (blockAudio && /Failed to load resource/.test(m.text())) return
    errors.push(`console: ${m.text()}`)
  })
  if (blockAudio) {
    await page.route(
      (u) => /\/audio\/.*\.mp3$/.test(new URL(u).pathname),
      (r) => {
        blockedRequests++
        return r.abort()
      },
    )
  }
  sampler = setInterval(async () => {
    try {
      const s = await page.evaluate(() => {
        const l = window.__los.loader.state.getState()
        if (l.status !== 'ready' || !l.act || l.act === 'sandbox' || window.__los.store.getState().screen !== 'game') return null
        return { act: l.act, calls: window.__los.stats.calls, tris: window.__los.stats.triangles }
      })
      if (s && s.calls > 0) samples.push(s)
    } catch {
      /* page is busy or closing */
    }
  }, 2500)
  const shot = (name) => page.screenshot({ path: join(shotDir, `${name}.png`) })
  const wait = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 })
  const objective = (text, timeout = 90000) => wait((t) => window.__los.store.getState().objective?.text?.includes(t), text, timeout)
  const subtitle = (text, timeout = 30000) => wait((t) => (window.__los.store.getState().subtitle?.text ?? '').includes(t), text, timeout)
  const unfocused = () => wait(() => !window.__los.focus(), null, 30000)
  const seen = (id) => page.evaluate((id) => window.__los.store.getState().anomaliesSeen.includes(id), id)
  const pos = () => page.evaluate(() => ({ ...window.__los.player.body.pos }))
  const actReady = (id) =>
    wait((id) => window.__los.loader.state.getState().act === id && window.__los.loader.state.getState().status === 'ready' && window.__los.player.body, id, 120000)
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
    await wait((id) => window.__los.interactables().find((i) => i.id === id)?.enabled, id, 30000)
    await aim(id)
    await wait((v) => window.__los.store.getState().target?.verb === v, verb, 30000)
    await page.keyboard.press('KeyE')
  }
  const z = async () => (await pos()).z
  const push = async (yaw, settle) => {
    await unfocused()
    await page.evaluate((yaw) => window.__los.player.set({ yaw, pitch: 0 }), yaw)
    const mark = await page.evaluate(() => {
      const v = window.__los.player.body.vel
      return { speed: Math.hypot(v.x, v.y, v.z), t: window.__los.gameTime() }
    })
    await page.keyboard.press('KeyE')
    // Wait for the push to show in the velocity, for at most 0.25 s of game time.
    await wait((m) => {
      const v = window.__los.player.body.vel
      return Math.abs(Math.hypot(v.x, v.y, v.z) - m.speed) > 0.05 || window.__los.gameTime() > m.t + 0.25
    }, mark, 30000)
  }

  await page.goto(url)
  await wait(() => window.__los, null, 30000)
  await wait(() => window.__los.loader.state.getState().status === 'ready', null, 30000)

  // Title, then Start.
  stage = 'title'
  await page.evaluate(() => window.__los.ui.go('title'))
  await page.waitForSelector('[data-screen="title"]')
  await shot('playthrough-title')
  await page.click('text=Start')

  // Act 0.
  stage = 'act0'
  await actReady('act0-pad')
  await objective('wave')
  await unfocused()
  await page.evaluate(() => window.__los.player.set({ yaw: -1.2, pitch: -0.5 }))
  await wait(() => window.__los.store.getState().target?.verb === 'WAVE', null, 30000)
  await page.keyboard.press('KeyE')
  await objective('White Room', 5000)
  await page.waitForTimeout(600)
  await shot('playthrough-act0')
  await unfocused()
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: 0 }))
  await page.keyboard.down('KeyW')
  await wait(() => window.__los.player.body.pos.z < -7.2, null, 40000)
  await page.keyboard.up('KeyW')
  // Gunter speaks only when talked to.
  await page.evaluate(() => window.__los.player.set({ yaw: -0.73, pitch: -0.2 }))
  await wait(() => window.__los.store.getState().target?.verb === 'TALK', null, 30000)
  await page.keyboard.press('KeyE')
  await subtitle('boot prints', 40000)
  check(await seen('extra-bootprints'), 'extra-bootprints noticed')
  await unfocused()
  await page.evaluate(() => window.__los.player.set({ yaw: 0, pitch: -0.1 }))
  await wait(() => window.__los.store.getState().target?.verb === 'GRAB', null, 30000)
  await page.keyboard.press('KeyE')

  // Act 1.
  stage = 'act1'
  await actReady('act1-launch')
  // The view does not turn by itself: look at the O2 gauge.
  await subtitle('oxygen', 90000)
  await page.evaluate(() => {
    const b = window.__los.player.body
    const dx = -0.35 - b.pos.x
    const dy = 1.5 - (b.pos.y + 1.65)
    const dz = -1.05 - b.pos.z
    window.__los.player.set({ yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) })
  })
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('o2-for-four'), null, 90000)
  await objective('red switch')
  await shot('playthrough-act1')
  await useAt('act1:switch', 'FLIP')
  await objective('computer in front of you')
  for (let i = 0; i < 3; i++) {
    await useAt('act1:dsky', 'KEY IN')
    await page.waitForTimeout(250)
  }

  // Act 2.
  stage = 'act2'
  await actReady('act2-coast')
  await objective('Repairs left')
  await unfocused()
  const hold = () => page.evaluate(() => window.__los.player.set({ vel: { x: 0, y: 0, z: 0 } }))
  // Cabin pressure.
  await hold()
  await useAt('act2:gauge', 'ADJUST')
  await page.waitForSelector('[data-testid="gauge"]', { timeout: 10000 })
  const reading = () => page.evaluate(() => parseFloat(document.querySelector('[data-testid="gauge"] text:last-of-type')?.textContent ?? '0'))
  await page.keyboard.down('KeyD')
  for (let i = 0; i < 400 && (await reading()) < 4.6; i++) await page.waitForTimeout(30)
  await page.keyboard.up('KeyD')
  await page.waitForFunction(() => !document.querySelector('[data-testid="gauge"]'), null, { timeout: 30000, polling: 100 })
  // Oxygen line.
  for (let i = 0; i < 100 && (await z()) > 0.6; i++) await push(0)
  if ((await z()) > 0.6) await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: 0.5 } }))
  await hold()
  await useAt('act2:pouch', 'TAKE')
  await wait(() => window.__los.interactables().find((i) => i.id === 'act2:joint')?.enabled, null, 10000)
  await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -0.4 }, vel: { x: 0, y: 0, z: 0 } }))
  for (let i = 0; i < 3; i++) {
    await hold()
    await useAt('act2:joint', 'TAP')
    await page.waitForTimeout(300)
  }
  // Computer.
  for (let i = 0; i < 100 && (await z()) > -3.2; i++) await push(0)
  if ((await z()) > -3.2) await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -3.6 } }))
  await page.evaluate(() => window.__los.player.set({ pos: { x: 0, y: 0.3, z: -5 }, vel: { x: 0, y: 0, z: 0 } }))
  for (let i = 0; i < 3; i++) {
    await hold()
    await useAt(`act2:comp${i}`, 'CLEAR')
    await page.waitForTimeout(300)
  }
  await objective('Float back up the tunnel')
  for (let i = 0; i < 100 && !(await seen("tunnel-longer")); i++) await push(Math.PI, 1500)
  check(await seen('tunnel-longer'), 'tunnel-longer noticed')
  await objective('sleeping bag')
  await unfocused()
  const bag = await page.evaluate(() => window.__los.interactables().find((i) => i.id === 'act2:bag').position)
  const b = await pos()
  if (Math.hypot(bag.x - b.x, bag.z - b.z) > 2) await page.evaluate((bz) => window.__los.player.set({ pos: { x: 0, y: 0.3, z: bz } }), bag.z)
  await useAt('act2:bag', 'SLEEP')
  await objective('Hold C')
  await shot('playthrough-act2')
  await page.keyboard.down('KeyC')
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('fourth-sleeper'), null, 90000)
  // Act 2 ends after 12 s of eyes closed in total, so keep C held until act 3 loads.
  await wait(() => window.__los.loader.state.getState().act === 'act3-farside', null, 60000)
  await page.keyboard.up('KeyC')

  // Act 3: the dream. Walk (teleports only where the act 3 script teleports), carry both crewmen, wake, answer.
  stage = 'act3'
  const teleport3 = (x, zz) => page.evaluate(([x, z]) => window.__los.player.set({ pos: { x, y: 0.2, z }, yaw: 0, pitch: 0 }), [x, zz])
  const frames = async () => {
    const t0 = await page.evaluate(() => window.__los.gameTime())
    await wait((t) => window.__los.gameTime() > t + 0.2, t0, 30000)
  }
  const phase3 = () => page.evaluate(() => window.__los.act3?.phase)
  await actReady('act3-farside')
  await wait(() => window.__los.director && window.__los.act3, null, 30000)
  await objective('Find Neil and Mike')
  await wait(() => window.__los.player.body.mode === 'walk', null, 30000)
  await teleport3(0, -4.2)
  await frames()
  await teleport3(0, -5.4)
  await objective('Hide in the locker', 20000)
  await wait(() => window.__los.director.monster.pos.z > -15.6, null, 30000)
  await page.keyboard.down('Space')
  await teleport3(-0.3, -9.5)
  await useAt('act3:locker0', 'HIDE')
  await wait(() => window.__los.store.getState().moveMode === 'seated', null, 30000)
  await shot('playthrough-act3')
  await objective('Find Neil and Mike')
  await page.keyboard.up('Space')
  await page.waitForTimeout(1500)
  await page.keyboard.press('KeyE')
  await wait(() => window.__los.store.getState().moveMode === 'walk', null, 30000)
  // The impostor call fires when a frame sees the body cross z = -14, so step across it.
  await unfocused()
  await teleport3(0, -13.5)
  await frames()
  await teleport3(0, -14.6)
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('impostor-capcom'), null, 30000)
  check(await seen('impostor-capcom'), 'impostor-capcom noticed')
  await subtitle('how many crew aboard', 30000)
  // The cage.
  await teleport3(0, -36.5)
  await frames()
  await teleport3(0, -39.4)
  await wait(() => window.__los.store.getState().checkpoint === 'wp1', null, 30000)
  await useAt('act3:cage', 'OPEN')
  await wait(() => window.__los.act3.phase === 'cageOpen', null, 30000)
  await teleport3(-0.3, -42.2)
  await useAt('act3:cdr', 'TAKE')
  await objective('Carry him back')
  check((await page.evaluate(() => window.__los.act3.carrying)) === 'cdr', 'carrying Neil')
  await teleport3(-0.4, 5.4)
  await useAt('act3:bags', 'LAY DOWN')
  await objective('Go back for the other one')
  check((await page.evaluate(() => window.__los.store.getState().checkpoint)) === 'wp2', 'wp2 set')
  // The silent corridor.
  await teleport3(0, -36.5)
  await frames()
  await teleport3(0, -41.2)
  await wait(() => window.__los.store.getState().checkpoint === 'wp3', null, 30000)
  await useAt('act3:second', 'TAKE')
  await wait(() => window.__los.act3.phase === 'lunge', null, 30000)
  await page.waitForTimeout(700)
  await shot('playthrough-act3-lunge')
  await wait(() => window.__los.act3.phase === 'choice', null, 90000)
  await shot('playthrough-act3-choice')
  await page.keyboard.press('Digit1')
  await wait(() => window.__los.store.getState().dreamChoice === 'dream', null, 30000)
  check((await phase3()) !== 'choice', 'choice taken with key 1')
  await wait(() => window.__los.loader.state.getState().act === 'act4-moon', null, 120000)

  // Act 4.
  stage = 'act4'
  const teleport4 = (x, zz) => page.evaluate(([x, z]) => window.__los.player.set({ pos: { x, y: 0, z }, yaw: 0, pitch: 0 }), [x, zz])
  const face = (x, zz) =>
    page.evaluate(([x, z]) => {
      const b = window.__los.player.body
      window.__los.player.set({ yaw: Math.atan2(-(x - b.pos.x), -(z - b.pos.z)), pitch: 0 })
    }, [x, zz])
  const walkTo = async (x, zz, stop = 1.2) => {
    const p0 = await pos()
    const d = Math.hypot(x - p0.x, zz - p0.z)
    if (d > 4) {
      const k = (d - 4) / d
      await teleport4(p0.x + (x - p0.x) * k, p0.z + (zz - p0.z) * k)
    }
    await face(x, zz)
    await page.keyboard.down('KeyW')
    for (let i = 0; i < 80; i++) {
      const p = await pos()
      if (Math.hypot(x - p.x, zz - p.z) <= stop) break
      await face(x, zz)
      await page.waitForTimeout(100)
    }
    await page.keyboard.up('KeyW')
  }
  await actReady('act4-moon')
  await wait(() => window.__los.act4, null, 30000)
  await objective('Surface tasks, any order', 120000)
  await shot('playthrough-act4')
  await teleport4(-0.75, 3.4)
  await useAt('act4:scoop', 'GRAB')
  await wait(() => window.__los.act4.carrying === 'scoop', null, 30000)
  await walkTo(9, 4.5)
  await useAt('act4:sample', 'GRAB')
  await wait(() => window.__los.act4.done.includes('sample'), null, 30000)
  await objective('Plant the flag', 5000)
  await teleport4(1.7, 4.6)
  await useAt('act4:flagkit', 'GRAB')
  await wait(() => window.__los.act4.carrying === 'flag', null, 30000)
  await walkTo(-1.5, 9)
  await useAt('act4:spot', 'GRAB')
  await wait(() => window.__los.act4.done.includes('flag'), null, 30000)
  await teleport4(-1.35, 3.3)
  await useAt('act4:seismokit', 'GRAB')
  await wait(() => window.__los.act4.carrying === 'seismo', null, 30000)
  await walkTo(-8, -5)
  await useAt('act4:seismo', 'GRAB')
  await wait(() => window.__los.act4.phase === 'emerge', null, 60000)
  await objective('Run to the ladder', 5000)
  await wait(() => window.__los.act4.creature?.phase === 'rim', null, 30000)
  await unfocused()
  await teleport4(-3.5, 7.5)
  await walkTo(0, 5.5, 0.9)
  await useAt('act4:ladder', 'GRAB')
  await wait(() => window.__los.act4?.phase === 'liftoff' && window.__los.act4.time >= 3.2, null, 60000)
  await wait(() => window.__los.store.getState().anomaliesSeen.includes('burn-baby-burn'), null, 30000).catch(() => {})
  check(await seen('burn-baby-burn'), 'burn-baby-burn noticed during liftoff')

  // Act 5, then the Archive.
  stage = 'act5'
  await actReady('act5-home')
  await wait(() => (window.__los.timeline() ?? 0) >= 33, null, 120000)
  await shot('playthrough-act5')
  await wait(() => window.__los.store.getState().screen === 'archive', null, 120000)
  stage = 'archive'
  await page.waitForTimeout(500)
  await shot('playthrough-archive')
  const got = await page.evaluate(() => window.__los.store.getState().anomaliesSeen)
  for (const id of ALL) check(got.includes(id), `${id} noticed in the full run`)
  const count = await page.evaluate(() => document.querySelector('[data-testid=archive-count]')?.textContent ?? '')
  check(count.includes('You noticed: 6 / 6.'), `archive count: ${count}`)
  const told = await page.evaluate(() => document.querySelector('[data-testid=archive-told]')?.textContent ?? '')
  check(told.includes('You told them:'), `archive choice line: ${told}`)
  check(await page.evaluate(() => document.querySelectorAll('.anomaly.noticed').length) === 6, 'six noticed rows')
  check(await page.evaluate(() => window.__los.store.getState().finished), 'act 5 saved as finished')
  const blocker = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-screen="archive"] button')].pop()
    if (!btn) return 'no button'
    btn.scrollIntoView()
    const r = btn.getBoundingClientRect()
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return top === btn ? null : `${top?.tagName}.${top?.className}`
  })
  check(blocker === null, `archive back button covered by ${blocker}`)
  check(await page.evaluate(() => document.pointerLockElement === null), 'pointer lock released on the Archive')
  await page.locator('[data-screen="archive"] button').last().click({ timeout: 30000 })
  await wait(() => window.__los.store.getState().screen === 'title', null, 30000)
  check(await page.locator('[data-screen="title"] button', { hasText: 'Archive' }).count() > 0, 'Archive button on the title screen')
} catch (e) {
  errors.push(`script (${stage}): ${e.message.split('\n')[0]} at ${(e.stack.match(/playthrough.mjs:(\d+)/g) ?? []).join(' ')}`)
  try {
    const dump = await browser.contexts()[0]?.pages()[0]?.evaluate(() => {
      const l = window.__los.loader.state.getState()
      const s = window.__los.store.getState()
      return JSON.stringify({ act: l.act, status: l.status, focus: window.__los.focus(), paused: s.paused, mode: s.moveMode, pos: window.__los.player.body?.pos, phase: window.__los.director?.state?.phase, timeline: window.__los.timeline(), objective: s.objective?.text })
    })
    errors.push(`state at failure: ${dump}`)
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shotDir, 'playthrough-fail.png') })
  } catch {
    /* no page */
  }
} finally {
  if (sampler) clearInterval(sampler)
  await browser.close()
}

// Draw calls and triangles per act: first sample, middle sample and the peak, all under budget.
const byAct = new Map()
for (const s of samples) byAct.set(s.act, [...(byAct.get(s.act) ?? []), s])
console.log(`stats (${blockAudio ? 'audio blocked' : 'audio on'}): act, first, middle, peak (calls / triangles)`)
for (const [act, list] of byAct) {
  const peakCalls = Math.max(...list.map((s) => s.calls))
  const peakTris = Math.max(...list.map((s) => s.tris))
  const f = list[0]
  const m = list[Math.floor(list.length / 2)]
  console.log(`  ${act.padEnd(13)} ${f.calls}/${f.tris}  ${m.calls}/${m.tris}  ${peakCalls}/${peakTris}  (${list.length} samples)`)
  check(peakCalls < 150, `${act}: peak draw calls ${peakCalls}, expected under 150`)
  check(peakTris < 150000, `${act}: peak triangles ${peakTris}, expected under 150000`)
}
if (!blockAudio) check(byAct.size >= 5, `stats sampled in ${byAct.size} acts`)
if (blockAudio) check(blockedRequests > 0, 'audio requests were blocked')

if (errors.length) {
  console.log(errors.join('\n'))
  process.exit(1)
}
console.log('errors: none')
