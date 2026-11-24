let lost = false
let logged = false

export function isContextLost(): boolean {
  return lost
}

/** Logs a lost context once, flags it, and clears the flag on restore. Returns cleanup. */
export function installContextLoss(canvas: HTMLCanvasElement): () => void {
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    if (!logged) {
      logged = true
      console.error('WebGL context lost')
    }
  }
  const onRestored = () => {
    lost = false
    logged = false
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    lost = false
    logged = false
  }
}
