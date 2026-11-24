import { useEffect, useMemo } from 'react'
import { registerSystem } from '../../engine/frameDriver'
import { buildFigure } from '../../procgen/figure'
import { PAD0_POS, PAD1_POS } from './room'
import { padWaveAmount } from './crowdLogic'
import { act0State } from './state'

const CREW_PRIORITY = 710

/** The two pad crew in white coveralls, no helmets. pad0 waves down at the crowd until the player has waved. */
export function PadCrew() {
  const crew = useMemo(() => {
    const pad0 = buildFigure({ name: 'pad0', suit: 'coverall', helmet: false })
    pad0.root.position.set(PAD0_POS.x, PAD0_POS.y, PAD0_POS.z)
    pad0.root.rotation.y = -0.28
    const pad1 = buildFigure({ name: 'pad1', suit: 'coverall', helmet: false })
    pad1.root.position.set(PAD1_POS.x, PAD1_POS.y, PAD1_POS.z)
    pad1.root.rotation.y = -0.1
    return { pad0, pad1 }
  }, [])

  useEffect(() => {
    const remove = registerSystem('act0-crew', CREW_PRIORITY, (_dt, t) => {
      const a = act0State.waved ? 0 : padWaveAmount(t)
      if (a > 0) crew.pad0.setPose('wave', t, a)
      else crew.pad0.setPose('standing', t)
      crew.pad1.setPose('standing', t + 1.7)
    })
    return () => {
      remove()
      crew.pad0.dispose()
      crew.pad1.dispose()
    }
  }, [crew])

  return (
    <>
      <primitive object={crew.pad0.root} />
      <primitive object={crew.pad1.root} />
    </>
  )
}
