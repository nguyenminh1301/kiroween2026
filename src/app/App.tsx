import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { GAME_TITLE } from '@/content/menus'

function SpinningBox() {
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.x += delta * 0.3
    ref.current.rotation.y += delta * 0.5
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8a8f98" flatShading />
    </mesh>
  )
}

export function App() {
  return (
    <>
      <Canvas
        style={{ position: 'fixed', inset: 0 }}
        camera={{ position: [0, 0, 3], fov: 60 }}
        gl={{ antialias: false }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 4]} intensity={1.5} />
        <SpinningBox />
      </Canvas>
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
    </>
  )
}
