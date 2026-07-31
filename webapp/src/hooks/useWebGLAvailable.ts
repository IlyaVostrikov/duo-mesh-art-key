import { useState } from 'react'

interface WebGLCapabilities {
  available: boolean
  /** Rough GPU tier: 0 = none, 1 = low/mobile, 2 = mid, 3 = high */
  tier: 0 | 1 | 2 | 3
  renderer: string | null
}

let cached: WebGLCapabilities | null = null

export function detectWebGL(): WebGLCapabilities {
  if (cached) return cached

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) {
      cached = { available: false, tier: 0, renderer: null }
      return cached
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
      : null

    // Rough GPU tier from renderer string
    let tier: 0 | 1 | 2 | 3 = 2
    const r = (renderer ?? '').toLowerCase()
    if (/mali|adreno|powervr|apple a[7-9]|apple g1[0-1]|mediatek/i.test(r)) {
      tier = 1 // mobile GPU
    } else if (/nvidia|amd|radeon|geforce|apple m[1-9]|apple g1[3-9]|apple g2/i.test(r)) {
      tier = 3 // discrete / high-end
    } else if (/intel.*u?hd|intel.*iris/i.test(r)) {
      tier = 2 // integrated
    }

    const gl2 = canvas.getContext('webgl2')
    canvas.width = 1
    canvas.height = 1
    gl2?.getExtension('WEBGL_lose_context')?.loseContext()

    cached = { available: true, tier, renderer }
    return cached
  } catch {
    cached = { available: false, tier: 0, renderer: null }
    return cached
  }
}

export function useWebGLAvailable(): WebGLCapabilities {
  const [caps] = useState(() => detectWebGL())
  return caps
}
