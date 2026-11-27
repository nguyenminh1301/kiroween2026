// Neil and Mike hanging upside down in the lit room behind the window at the first junction.
import { useEffect, useMemo } from 'react'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure } from '../../procgen/figure'
import { HEIGHT, WINDOW_CREW } from './layout'
import { act3State, type Crew } from './state'

const PRIORITY = 707
const HANG_Y = HEIGHT - 0.12

export function WindowCrew() {
  const figures = useMemo(() => {
    const make = (who: Crew) => {
      const f = buildFigure({ name: `${who}-window`, helmet: true, visorUp: true })
      f.root.position.set(WINDOW_CREW[who].x, HANG_Y, WINDOW_CREW[who].z)
      return f
    }
    return { cdr: make('cdr'), cmp: make('cmp') }
  }, [])
  useEffect(
    () =>
      registerSystem('act3-window-crew', PRIORITY, (_dt, t) => {
        const dream = act3State.world === 'dream'
        ;(['cdr', 'cmp'] as const).forEach((who, i) => {
          const f = figures[who]
          // Once a crewman is carried off, his place in the window is empty too.
          f.root.visible = dream && act3State.carried !== who && !act3State.laid[who]
          if (!f.root.visible) return
          f.setPose('hanging', t * 0.8 + i * 1.7)
          f.root.rotation.y = (i === 0 ? 1 : -1) * (t * 0.18 + i * 0.8)
        })
      }),
    [figures],
  )
  useEffect(
    () => () => {
      figures.cdr.dispose()
      figures.cmp.dispose()
    },
    [figures],
  )
  return (
    <>
      <primitive object={figures.cdr.root} />
      <primitive object={figures.cmp.root} />
    </>
  )
}
