// The creature's waypoint graph and routing. Pure: no Three.js or React imports.
// Nodes sit at door and corner centres. An edge exists where `clear` says a straight walk keeps the creature
// off every wall, so a route never cuts across a wall corner.

export interface Pt {
  x: number
  z: number
}

export const PATROL_SPEED = 0.8

export interface Nav {
  nodes: Pt[]
  /** The patrol route, visited in order, round and round. */
  patrol: Pt[]
  /** Places it looks into now and then. */
  peeks: Pt[]
  /** A straight walk from a to b keeps clear of walls. */
  clear(a: Pt, b: Pt): boolean
  /** Neighbours of each node by index. */
  adj: number[][]
}

export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.z - a.z)

/** Facing angle that looks from `a` toward `b`. Yaw convention: 0 faces -z. */
export const headingTo = (a: Pt, b: Pt): number => Math.atan2(-(b.x - a.x), -(b.z - a.z))

export function createNav(nodes: Pt[], clear: (a: Pt, b: Pt) => boolean, patrol: Pt[], peeks: Pt[]): Nav {
  const adj: number[][] = nodes.map(() => [])
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (clear(nodes[i], nodes[j])) {
        adj[i].push(j)
        adj[j].push(i)
      }
    }
  }
  return { nodes, patrol, peeks, clear, adj }
}

/** Waypoints from `from` to `to`, not counting `from`. Ends at `to` when some node sees it, else at the nearest node. */
export function route(nav: Nav, from: Pt, to: Pt): Pt[] {
  if (nav.clear(from, to)) return [to]
  const n = nav.nodes.length
  const best = new Array<number>(n).fill(Infinity)
  const prev = new Array<number>(n).fill(-1)
  const done = new Array<boolean>(n).fill(false)
  let any = false
  for (let i = 0; i < n; i++) {
    if (nav.clear(from, nav.nodes[i])) {
      best[i] = dist(from, nav.nodes[i])
      any = true
    }
  }
  if (!any) {
    // Standing where no node can be seen (inside a wall margin): walk to the nearest node.
    let k = 0
    for (let i = 1; i < n; i++) if (dist(from, nav.nodes[i]) < dist(from, nav.nodes[k])) k = i
    return [nav.nodes[k]]
  }
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i
    if (u < 0) break
    done[u] = true
    for (const v of nav.adj[u]) {
      const w = best[u] + dist(nav.nodes[u], nav.nodes[v])
      if (w < best[v]) {
        best[v] = w
        prev[v] = u
      }
    }
  }
  let goal = -1
  let goalCost = Infinity
  let near = -1
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue
    if (nav.clear(nav.nodes[i], to)) {
      const c = best[i] + dist(nav.nodes[i], to)
      if (c < goalCost) {
        goalCost = c
        goal = i
      }
    }
    if (near < 0 || dist(nav.nodes[i], to) < dist(nav.nodes[near], to)) near = i
  }
  const last = goal >= 0 ? goal : near
  const out: Pt[] = []
  for (let i = last; i >= 0; i = prev[i]) out.unshift(nav.nodes[i])
  if (goal >= 0) out.push(to)
  return out
}

/** Length of a walk from `from` through `path`. */
export function pathLength(from: Pt, path: Pt[]): number {
  let at = from
  let sum = 0
  for (const p of path) {
    sum += dist(at, p)
    at = p
  }
  return sum
}

/** Index of the patrol waypoint with the shortest walk from `p`. */
export function nearestPatrol(nav: Nav, p: Pt): number {
  let bestI = 0
  let bestL = Infinity
  nav.patrol.forEach((w, i) => {
    const l = pathLength(p, route(nav, p, w))
    if (l < bestL) {
      bestL = l
      bestI = i
    }
  })
  return bestI
}

/** Up to `count` nodes near `p` that it can walk to in a line, nearest first, skipping any within 0.8 m. */
export function nearbyNodes(nav: Nav, p: Pt, radius: number, count: number, rng: () => number): Pt[] {
  const ok = nav.nodes.filter((n) => dist(n, p) > 0.8 && dist(n, p) <= radius && nav.clear(p, n))
  const out: Pt[] = []
  const pool = [...ok].sort((a, b) => dist(a, p) - dist(b, p))
  while (out.length < count && pool.length > 0) {
    // Mostly the nearest, sometimes the next one.
    const k = Math.min(pool.length - 1, Math.floor(rng() * rng() * pool.length))
    out.push(pool.splice(k, 1)[0])
  }
  return out
}
