// The creature: a wrong copy of an astronaut, built from boxes in code. About 2.1 m tall standing.
// Too-long limbs with an extra joint, long fingers, suit fabric and gold foil, a smooth dome
// with seven cables where a face should be. Animated in code: stalk walk, freeze, low crawl.
import { useEffect, useMemo } from 'react'
import { Float32BufferAttribute, Group, Mesh, SphereGeometry, type BufferGeometry } from 'three'
import { registerSystem } from '../../engine/frameDriver'
import { createMaterial, disposeMaterial } from '../../render/materialFactory'
import { cbox, ccyl, mergeColored } from './geo'
import { act3State } from './state'

const CREATURE_PRIORITY = 710
const FABRIC = '#bdb6a2'
const FABRIC_DARK = '#7d7666'
const FOIL = '#b8a06a'
const CABLE = '#1a1512'
const FINGER = '#a39c88'

interface Bones {
  root: Group
  spine: Group
  neck: Group
  cables: Group[]
  arm: [Group, Group, Group][]
  leg: [Group, Group, Group][]
}

const mesh = (g: BufferGeometry, mat: Mesh['material']): Mesh => new Mesh(g, mat)

/** A limb segment that hangs down from its pivot. */
function seg(len: number, w: number, color: string, extra: BufferGeometry[] = []): BufferGeometry {
  return mergeColored([cbox(w, len, w, color, 0, -len / 2, 0), ...extra])
}

function build(mat: Mesh['material']): Bones {
  const root = new Group()
  const spine = new Group()
  spine.position.set(0, 1.1, 0)
  root.add(spine)
  // Pelvis, torso wrapped in fabric with foil patches.
  root.add(mesh(mergeColored([cbox(0.34, 0.2, 0.22, FABRIC_DARK, 0, 1.08, 0)]), mat))
  spine.add(
    mesh(
      mergeColored([
        cbox(0.44, 0.72, 0.26, FABRIC, 0, 0.38, 0),
        cbox(0.46, 0.14, 0.28, FOIL, 0, 0.22, 0),
        cbox(0.2, 0.26, 0.28, FOIL, 0.08, 0.56, 0),
        cbox(0.5, 0.08, 0.3, FABRIC_DARK, 0, 0.74, 0),
      ]),
      mat,
    ),
  )
  const neck = new Group()
  neck.position.set(0, 0.78, 0.02)
  spine.add(neck)
  neck.add(mesh(mergeColored([ccyl(0.05, 0.22, FABRIC_DARK, 0, 0.1, 0.02, 'y', 5)]), mat))
  const dome = new SphereGeometry(0.17, 8, 6)
  dome.scale(1, 1.25, 1.05)
  dome.translate(0, 0.32, 0.04)
  dome.setAttribute('color', new Float32BufferAttribute(new Float32Array(dome.attributes.position.count * 3).fill(0.85), 3))
  const domeMesh = new Mesh(dome, mat)
  // Smooth dome: flat pale colour.
  neck.add(domeMesh)
  const cables: Group[] = []
  for (let i = 0; i < 7; i++) {
    const g = new Group()
    const a = (i / 7) * Math.PI * 2
    g.position.set(Math.cos(a) * 0.12, 0.42, Math.sin(a) * 0.12 + 0.04)
    const len = 0.45 + (i % 3) * 0.18
    g.add(mesh(mergeColored([cbox(0.018, len, 0.018, CABLE, 0, -len / 2, 0)]), mat))
    neck.add(g)
    cables.push(g)
  }

  const limb = (x: number, y: number, lens: [number, number, number], w: number, fingers: boolean): [Group, Group, Group] => {
    const a = new Group()
    a.position.set(x, y, 0)
    a.add(mesh(seg(lens[0], w, FABRIC), mat))
    const b = new Group()
    b.position.y = -lens[0]
    b.add(mesh(seg(lens[1], w * 0.85, FABRIC_DARK), mat))
    const c = new Group()
    c.position.y = -lens[1]
    const parts: BufferGeometry[] = []
    if (fingers) {
      for (let f = 0; f < 5; f++) parts.push(cbox(0.018, 0.34, 0.018, FINGER, (f - 2) * 0.028, -lens[2] - 0.17, 0))
    } else {
      parts.push(cbox(0.1, 0.06, 0.28, FOIL, 0, -lens[2] - 0.02, 0.08))
    }
    c.add(mesh(seg(lens[2], w * 0.7, FABRIC, parts), mat))
    a.add(b)
    b.add(c)
    return [a, b, c]
  }
  const arm: [Group, Group, Group][] = [
    limb(-0.3, 0.7, [0.6, 0.6, 0.5], 0.09, true),
    limb(0.3, 0.7, [0.6, 0.6, 0.5], 0.09, true),
  ]
  arm.forEach(([a]) => spine.add(a))
  const leg: [Group, Group, Group][] = [
    limb(-0.12, 1.08, [0.52, 0.52, 0.18], 0.12, false),
    limb(0.12, 1.08, [0.52, 0.52, 0.18], 0.12, false),
  ]
  leg.forEach(([a]) => root.add(a))
  return { root, spine, neck, cables, arm, leg }
}

/** Pose the bones for the current animation. `t` is time in seconds, `phase` the gait phase. */
function pose(b: Bones, anim: 'walk' | 'freeze' | 'crawl', t: number, phase: number): void {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  b.cables.forEach((cb, i) => {
    cb.rotation.x = Math.sin(t * 1.3 + i) * 0.12
    cb.rotation.z = Math.cos(t * 1.1 + i * 2) * 0.12
  })
  if (anim === 'crawl') {
    b.root.position.y = 0.0
    b.spine.rotation.x = -1.25
    b.neck.rotation.x = 1.0 + Math.sin(t * 5) * 0.05
    b.arm.forEach(([a, e, w], i) => {
      const k = i === 0 ? s : -s
      a.rotation.x = -2.5 + k * 0.5
      e.rotation.x = -0.3 - Math.max(0, k) * 0.4
      w.rotation.x = -0.2
    })
    b.leg.forEach(([a, k, f], i) => {
      const q = i === 0 ? -s : s
      a.rotation.x = -1.2 + q * 0.5
      k.rotation.x = 1.4
      f.rotation.x = -0.4
    })
    return
  }
  b.root.position.y = 0
  if (anim === 'walk') {
    b.spine.rotation.x = -0.12 + Math.sin(phase * 2) * 0.03
    b.neck.rotation.x = 0.1
    b.arm.forEach(([a, e, w], i) => {
      const k = i === 0 ? c : -c
      a.rotation.x = k * 0.25
      e.rotation.x = -0.5
      w.rotation.x = -0.35
    })
    b.leg.forEach(([a, k, f], i) => {
      const q = i === 0 ? s : -s
      a.rotation.x = q * 0.45
      k.rotation.x = 0.35 + Math.max(0, -q) * 0.7
      f.rotation.x = -0.3
    })
  } else {
    // Freeze: still, with a slow wrong tilt of the head.
    b.spine.rotation.x = -0.05
    b.neck.rotation.x = 0.05
    b.neck.rotation.z = Math.sin(t * 0.6) * 0.22
    b.arm.forEach(([a, e, w], i) => {
      a.rotation.x = 0.05
      a.rotation.z = i === 0 ? 0.05 : -0.05
      e.rotation.x = -0.4 + Math.sin(t * 0.9 + i) * 0.05
      w.rotation.x = -0.3
    })
    b.leg.forEach(([a, k, f]) => {
      a.rotation.x = 0.05
      k.rotation.x = 0.2
      f.rotation.x = -0.2
    })
  }
}

export function Creature() {
  const mat = useMemo(() => createMaterial({ vertexColors: true }), [])
  const bones = useMemo(() => {
    const b = build(mat)
    b.root.visible = false
    return b
  }, [mat])

  useEffect(() => {
    let phase = 0
    const remove = registerSystem('act3-creature', CREATURE_PRIORITY, (dt, t) => {
      const m = act3State.monster
      const vis = !!m && act3State.creatureVisible
      bones.root.visible = vis
      if (!m || !vis) return
      const moving = m.anim !== 'freeze'
      phase += dt * (m.anim === 'crawl' ? 7 : m.mode === 'hunt' || m.mode === 'encounter' ? 4.2 : 2.6) * (moving ? 1 : 0)
      bones.root.position.set(m.pos.x, act3State.creatureY, m.pos.z)
      bones.root.rotation.y = m.heading + Math.PI
      pose(bones, m.anim, t, phase)
    })
    return () => {
      remove()
    }
  }, [bones])

  useEffect(
    () => () => {
      bones.root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    },
    [bones],
  )
  useEffect(
    () => () => {
      disposeMaterial(mat)
    },
    [mat],
  )
  return <primitive object={bones.root} />
}
