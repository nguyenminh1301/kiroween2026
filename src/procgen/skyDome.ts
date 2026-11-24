// Sky dome and sun disc, shared by every outdoor act. No fog, drawn behind everything.
import {
  BackSide,
  CircleGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three'

export interface SkyColors {
  top: string
  horizon: string
  bottom: string
}

export interface SkyDome {
  mesh: Mesh
  dispose(): void
}

/** Gradient sphere seen from inside. Above the horizon fades horizon to top, below it fades to bottom. */
export function buildSkyDome(colors: SkyColors, radius = 900): SkyDome {
  const geo = new SphereGeometry(radius, 24, 24)
  const top = new Color(colors.top)
  const hor = new Color(colors.horizon)
  const bot = new Color(colors.bottom)
  const pos = geo.attributes.position
  const arr = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / radius
    if (h >= 0) c.copy(hor).lerp(top, Math.pow(h, 0.55))
    else c.copy(hor).lerp(bot, Math.min(1, Math.pow(-h, 0.4) * 1.6))
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3))
  const material = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false, depthTest: false })
  const mesh = new Mesh(geo, material)
  mesh.renderOrder = -1000
  mesh.frustumCulled = false
  return {
    mesh,
    dispose() {
      geo.dispose()
      material.dispose()
    },
  }
}

export interface SunOptions {
  color?: string
  /** Angular radius in degrees. */
  size?: number
  /** Unit-less direction from the viewer. */
  direction: { x: number; y: number; z: number }
  distance?: number
}

/** A flat bright disc placed along `direction`, facing the origin. */
export function buildSunDisc(opts: SunOptions): SkyDome {
  const distance = opts.distance ?? 800
  const r = distance * Math.tan(((opts.size ?? 3.5) * Math.PI) / 180)
  const geo = new CircleGeometry(r, 16)
  const material = new MeshBasicMaterial({
    color: new Color(opts.color ?? '#fff1d6'),
    fog: false,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  })
  const mesh = new Mesh(geo, material)
  const d = opts.direction
  const len = Math.hypot(d.x, d.y, d.z) || 1
  mesh.position.set((d.x / len) * distance, (d.y / len) * distance, (d.z / len) * distance)
  mesh.lookAt(0, 0, 0)
  mesh.renderOrder = -999
  mesh.frustumCulled = false
  return {
    mesh,
    dispose() {
      geo.dispose()
      material.dispose()
    },
  }
}
