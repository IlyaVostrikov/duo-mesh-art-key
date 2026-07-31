import { useState, useCallback } from 'react'

/**
 * Provides a `contextKey` that increments on WebGL context restore,
 * forcing a full Canvas re-mount to reload lost GPU resources.
 */
export function useContextLossRecovery() {
  const [contextKey, setContextKey] = useState(0)
  const [contextLost, setContextLost] = useState(false)

  const onCreated = useCallback((state: { gl: { domElement: HTMLCanvasElement } }) => {
    const canvas = state.gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      setContextLost(true)
      console.warn('[WebGL] context lost — preserving for restore')
    }
    const onRestored = () => {
      setContextKey((k) => k + 1)
      setContextLost(false)
      console.log('[WebGL] context restored — re-mounting canvas')
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    ;(canvas as any).__ctxLossHandlers = { onLost, onRestored }
  }, [])

  return { contextKey, contextLost, onCreated }
}
