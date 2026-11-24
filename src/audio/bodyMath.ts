export const HEART_MIN = 60
export const HEART_MAX = 180
export const HEARTBEAT_THRESHOLD = 100

/** Heart rate in bpm, NaN counts as 60, clamped to 60 to 180. */
export function clampHeartRate(bpm: number): number {
  if (!Number.isFinite(bpm)) return HEART_MIN
  return Math.min(HEART_MAX, Math.max(HEART_MIN, bpm))
}

/** Breaths per minute: 12 at 60 bpm, 40 at 180 bpm, linear, clamped. */
export function breathRate(bpm: number): number {
  const hr = clampHeartRate(bpm)
  return 12 + ((hr - HEART_MIN) / (HEART_MAX - HEART_MIN)) * 28
}

/** Heartbeat level 0 to 1: silent at 100 bpm and below, full at 180. */
export function heartbeatLevel(bpm: number): number {
  const hr = clampHeartRate(bpm)
  if (hr <= HEARTBEAT_THRESHOLD) return 0
  return (hr - HEARTBEAT_THRESHOLD) / (HEART_MAX - HEARTBEAT_THRESHOLD)
}

/** Breath loudness 0 to 1 for a phase in cycles: a rising inhale then a longer fading exhale. */
export function breathEnvelope(phase: number): number {
  const p = ((phase % 1) + 1) % 1
  return p < 0.4 ? Math.sin((p / 0.4) * (Math.PI / 2)) : Math.cos(((p - 0.4) / 0.6) * (Math.PI / 2))
}
