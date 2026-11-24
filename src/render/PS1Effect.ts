import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'
import { frameDriver } from '../engine/frameDriver'
import { gameStore } from '../engine/store'
import { adaptiveScaler } from './adaptiveScaler'
import { lookParams } from './fear'
import { lookupLevel } from './levelTable'
import { grainSeed } from './ps1Math'
import { PS1_FRAGMENT_SHADER } from './ps1Shader'

export class PS1Effect extends Effect {
  constructor() {
    super('PS1Effect', PS1_FRAGMENT_SHADER, {
      uniforms: new Map<string, Uniform>([
        ['fringe', new Uniform(0)],
        ['vignette', new Uniform(0.25)],
        ['noise', new Uniform(0.2)],
        ['seed', new Uniform(0)],
        ['invRes', new Uniform(new Vector2(1 / 640, 1 / 360))],
      ]),
    })
  }

  /** Reads the store and level every frame. No React state involved. */
  override update(): void {
    const { fear, settings } = gameStore.getState()
    const { vignette, fringe, noise } = lookParams(fear, settings.reducedMotion)
    const u = this.uniforms
    u.get('fringe')!.value = fringe
    u.get('vignette')!.value = vignette
    u.get('noise')!.value = noise
    u.get('seed')!.value = grainSeed(frameDriver.getGameTime())
    const { width, height } = lookupLevel(adaptiveScaler.getLevel())
    ;(u.get('invRes')!.value as Vector2).set(1 / width, 1 / height)
  }
}
