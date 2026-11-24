import { useEffect, useState } from 'react'
import { getRenderStats } from './renderStats'

const stats = getRenderStats()

function read(): string {
  return `${stats.frameMs.toFixed(1)} ms  ${stats.calls} calls  ${stats.triangles} tris  ${stats.internalWidth}x${stats.internalHeight}`
}

/** Debug-only overlay. Reads at most 4 times a second. */
export function StatsBox() {
  const [text, setText] = useState(read)
  useEffect(() => {
    const id = window.setInterval(() => setText(read()), 250)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.8)',
        color: '#33ff33',
        fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace',
        fontSize: 11,
        pointerEvents: 'none',
        zIndex: 10,
        whiteSpace: 'pre',
      }}
    >
      {text}
    </div>
  )
}
