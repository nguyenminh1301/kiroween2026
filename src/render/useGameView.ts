import { useEffect, useState, useSyncExternalStore } from 'react'
import { adaptiveScaler } from './adaptiveScaler'
import { gameViewSize, type Rect } from './gameView'

export function useLevel(): number {
  return useSyncExternalStore(adaptiveScaler.subscribe, adaptiveScaler.getLevel)
}

export function useGameRect(): Rect {
  const [rect, setRect] = useState(() => gameViewSize(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const onResize = () => setRect(gameViewSize(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return rect
}
