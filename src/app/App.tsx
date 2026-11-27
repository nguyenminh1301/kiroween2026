import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import { FrameDriver } from '@/engine/FrameDriver'
import { Input } from '@/engine/Input'
import { PointerLockController } from '@/engine/PointerLockController'
import { isDebugUrl } from '@/engine/inputRuntime'
import { Markers } from '@/interaction/Markers'
import { UiRoot } from '@/ui/UiRoot'
import { GameView, RenderRuntime } from '@/render/GameView'
import { RenderBoundary } from '@/render/RenderBoundary'
import { PS1Composer } from '@/render/PS1Composer'
import { StatsBox } from '@/render/StatsBox'
import { loader } from './loader'

function useLoaderState() {
  return useSyncExternalStore(loader.subscribe, loader.getState)
}

export function App() {
  const state = useLoaderState()
  const Scene = state.status === 'ready' ? (loader.getModule()?.Scene ?? null) : null

  return (
    <>
      <RenderBoundary>
      <GameView>
        {(dpr) => (
          <Canvas
            style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
            camera={{ position: [0, 0, 3], fov: 60 }}
            gl={{ antialias: false }}
            dpr={dpr}
          >
            <color attach="background" args={['#000000']} />
            <FrameDriver />
            <RenderRuntime />
            <PS1Composer />
            <Input />
            <PointerLockController />
            <Markers />
            {Scene ? <Scene key={state.act} /> : null}
          </Canvas>
        )}
      </GameView>
      </RenderBoundary>
      {isDebugUrl() ? <StatsBox /> : null}
      <UiRoot />
    </>
  )
}
