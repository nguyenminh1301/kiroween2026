import { Component, type ReactNode } from 'react'
import { gameStore } from '../engine/store'

interface Props {
  children: ReactNode
}

/**
 * Catches a renderer that cannot start, for example "Error creating WebGL context".
 * It renders nothing (black) and flags the store, so the UI can show the no-WebGL
 * message in the game while the menus keep working.
 */
export class RenderBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error): void {
    console.warn('renderer failed:', error.message)
    gameStore.getState().setRenderFailed(true)
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}
