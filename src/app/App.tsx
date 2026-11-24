import { Canvas } from '@react-three/fiber'
import { useSyncExternalStore } from 'react'
import { FrameDriver } from '@/engine/FrameDriver'
import { Input } from '@/engine/Input'
import { PointerLockController } from '@/engine/PointerLockController'
import { isDebugUrl } from '@/engine/inputRuntime'
import { GAME_TITLE } from '@/content/menus'
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
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        camera={{ position: [0, 0, 3], fov: 60 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={['#000000']} />
        <FrameDriver />
        <Input />
        <PointerLockController />
        {Scene ? <Scene key={state.act} /> : null}
      </Canvas>
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
