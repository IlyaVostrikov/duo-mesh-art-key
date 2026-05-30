import '@google/model-viewer'
import { createElement, useRef, useEffect, type RefObject } from 'react'

type ModelViewerElement = HTMLElement & {
  setAttribute(name: string, value: string): void
}

interface ModelViewer3DProps {
  modelUrl: string
  posterUrl?: string
  className?: string
  style?: React.CSSProperties
}

export function ModelViewer3D({ modelUrl, posterUrl, className, style }: ModelViewer3DProps) {
  const ref = useRef<ModelViewerElement>(null) as RefObject<ModelViewerElement>

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.setAttribute('src', modelUrl)
    if (posterUrl) el.setAttribute('poster', posterUrl)
    el.setAttribute('camera-controls', '')
    el.setAttribute('auto-rotate', '')
    el.setAttribute('rotation-per-second', '20deg')
    el.setAttribute('ar', '')
    el.setAttribute('ar-modes', 'webxr scene-viewer quick-look')
    el.setAttribute('shadow-intensity', '1')
    el.setAttribute('exposure', '1')
    el.setAttribute('environment-image', 'neutral')
    el.setAttribute('loading', 'lazy')
    el.setAttribute('reveal', 'auto')
  }, [modelUrl, posterUrl])

  return createElement('model-viewer', {
    ref,
    className,
    style: { width: '100%', height: '100%', minHeight: '400px', ...style },
  })
}
