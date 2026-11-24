import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import { FrameDriver } from '@/engine/FrameDriver'
import { Input } from '@/engine/Input'
import { PointerLockController } from '@/engine/PointerLockController'
import { isDebugUrl } from '@/engine/inputRuntime'
import { GAME_TITLE } from '@/content/menus'
import { GameView, RenderRuntime } from '@/render/GameView'
import { PS1Composer } from '@/render/PS1Composer'
import { StatsBox } from '@/render/StatsBox'
import { loader } from './loader'

function useLoaderState() {
  return useSyncExternalStore(loader.subscribe, loader.getState)
}

export function App() {
  const state = useLoaderState()
  const Scene = state.status === 'ready' ? (loader.getModule()?.Scene ?? null) : null
  const showTitle = !isDebugUrl() && state.act === null

  return (
    <>
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
            {Scene ? <Scene key={state.act} /> : null}
          </Canvas>
        )}
      </GameView>
      {isDebugUrl() ? <StatsBox /> : null}
      {showTitle ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: '#d8d8d8',
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: 12,
            letterSpacing: '0.3em',
          }}
        >
          {GAME_TITLE}
        </div>
      ) : null}
    </>
  )
}
