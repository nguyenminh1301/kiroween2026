import type { Box } from '../../engine/collision'
import { PlayerCamera } from '../../engine/PlayerCamera'
import {
  CEILING,
  EAST_WALL,
  NORTH_WALL,
  OBSTACLES,
  RAMP_ANGLE,
  RAMP_END_X,
  RAMP_HEIGHT,
  RAMP_START_X,
  ROOM_HALF,
  SEAT_BACK,
  SEAT_BOX,
  SOUTH_WALL,
  WEST_WALL,
  ZERO_G_ZONE,
} from './room'

function BoxMesh({ box, color, opacity }: { box: Box; color: string; opacity?: number }) {
  const w = box.max.x - box.min.x
  const h = box.max.y - box.min.y
  const d = box.max.z - box.min.z
  return (
    <mesh position={[box.min.x + w / 2, box.min.y + h / 2, box.min.z + d / 2]}>
      <boxGeometry args={[w, h, d]} />
      {opacity === undefined ? (
        <meshLambertMaterial color={color} />
      ) : (
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      )}
    </mesh>
  )
}

const RAMP_RUN = RAMP_END_X - RAMP_START_X
const RAMP_LENGTH = RAMP_RUN / Math.cos(RAMP_ANGLE)
const RAMP_THICKNESS = 0.2
// The top face passes through (RAMP_START_X, 0) and (RAMP_END_X, RAMP_HEIGHT).
const RAMP_CENTER_X = RAMP_START_X + RAMP_RUN / 2 + (Math.sin(RAMP_ANGLE) * RAMP_THICKNESS) / 2
const RAMP_CENTER_Y = RAMP_HEIGHT / 2 - (Math.cos(RAMP_ANGLE) * RAMP_THICKNESS) / 2

/** Plain-colour room. Fewer than 25 draw calls. No PS1 look. */
export function Scene() {
  return (
    <>
      <color attach="background" args={['#101010']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} />
      <PlayerCamera />

      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[ROOM_HALF * 2, 0.1, ROOM_HALF * 2]} />
        <meshLambertMaterial color="#6e6e6e" />
      </mesh>
      <BoxMesh box={NORTH_WALL} color="#8a8a8a" />
      <BoxMesh box={SOUTH_WALL} color="#8a8a8a" />
      <BoxMesh box={WEST_WALL} color="#8a8a8a" />
      <BoxMesh box={EAST_WALL} color="#8a8a8a" />
      <BoxMesh box={CEILING} color="#7a7a7a" />
      {OBSTACLES.map((b, i) => (
        <BoxMesh key={i} box={b} color="#a0a0a0" />
      ))}

      <mesh position={[RAMP_CENTER_X, RAMP_CENTER_Y, 0]} rotation={[0, 0, RAMP_ANGLE]}>
        <boxGeometry args={[RAMP_LENGTH, RAMP_THICKNESS, ROOM_HALF * 2]} />
        <meshLambertMaterial color="#9a9a8a" />
      </mesh>
      <mesh position={[(RAMP_END_X + ROOM_HALF) / 2, RAMP_HEIGHT / 2, 0]}>
        <boxGeometry args={[ROOM_HALF - RAMP_END_X, RAMP_HEIGHT, ROOM_HALF * 2]} />
        <meshLambertMaterial color="#9a9a8a" />
      </mesh>

      <BoxMesh box={SEAT_BOX} color="#5a6a8a" />
      <BoxMesh box={SEAT_BACK} color="#5a6a8a" />
      <BoxMesh box={ZERO_G_ZONE} color="#4a7aaa" opacity={0.12} />
    </>
  )
}
