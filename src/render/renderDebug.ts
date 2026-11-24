import type { AdaptiveScaler } from './adaptiveScaler'

export interface RenderDebug {
  setLevel(n: number): void
  auto(on: boolean): void
}

export function installRenderDebug(scaler: AdaptiveScaler): RenderDebug {
  return {
    setLevel: (n) => scaler.setLevel(n),
    auto: (on) => scaler.setAuto(on),
  }
}
