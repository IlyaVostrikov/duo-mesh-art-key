import { useEffect, useState, useRef, useMemo } from 'react'
import * as THREE from 'three'

/** Preloads textures and caches them by URL. Only re-runs when the URL set changes. */
export function useTextureCache(urls: (string | null)[]) {
  const [cache, setCache] = useState<Map<string, THREE.Texture | null>>(new Map())
  const loadingRef = useRef<Set<string>>(new Set())

  // Stable key — only changes when the actual set of URLs changes
  const urlKey = useMemo(() => {
    return [...new Set(urls.filter(Boolean))].sort().join('|')
  }, [urls])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let cancelled = false
    const toLoad = urlKey ? urlKey.split('|').filter((u) => u && !loadingRef.current.has(u)) : []

    for (const url of toLoad) {
      loadingRef.current.add(url)
      loader.load(
        url,
        (tex) => {
          if (!cancelled) {
            tex.colorSpace = THREE.SRGBColorSpace
            setCache((prev) => { const n = new Map(prev); n.set(url, tex); return n })
          }
        },
        undefined,
        () => {},
      )
    }

    return () => { cancelled = true }
  }, [urlKey])

  return cache
}
