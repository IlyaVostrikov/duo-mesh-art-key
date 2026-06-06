import { useEffect, useState, useRef, useMemo } from 'react'
import * as THREE from 'three'

const MAX_CACHE = 60

/** Preloads textures, caches them by URL, and disposes when removed from cache or on unmount. */
export function useTextureCache(urls: (string | null)[]) {
  const [cache, setCache] = useState<Map<string, THREE.Texture | null>>(new Map())
  const loadingRef = useRef<Set<string>>(new Set())
  const disposedRef = useRef<Set<string>>(new Set())

  // Stable key — only changes when the actual set of URLs changes
  const urlKey = useMemo(() => {
    return [...new Set(urls.filter(Boolean))].sort().join('|')
  }, [urls])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let cancelled = false
    const activeUrls = new Set(urlKey ? urlKey.split('|') : [])

    // Dispose textures that are no longer in the active set
    setCache((prev) => {
      const next = new Map(prev)
      let changed = false
      for (const [url, tex] of prev) {
        if (!activeUrls.has(url)) {
          if (tex) tex.dispose()
          next.delete(url)
          changed = true
        }
      }
      return changed ? next : prev
    })

    // Evict oldest entries if over limit
    setCache((prev) => {
      if (prev.size <= MAX_CACHE) return prev
      const entries = [...prev.entries()]
      entries.slice(0, entries.length - MAX_CACHE).forEach(([, tex]) => {
        if (tex) tex.dispose()
      })
      return new Map(entries.slice(entries.length - MAX_CACHE))
    })

    const toLoad = urlKey ? urlKey.split('|').filter((u) => u && !loadingRef.current.has(u)) : []

    for (const url of toLoad) {
      loadingRef.current.add(url)
      loader.load(
        url,
        (tex) => {
          if (!cancelled && !disposedRef.current.has(url)) {
            tex.colorSpace = THREE.SRGBColorSpace
            setCache((prev) => { const n = new Map(prev); n.set(url, tex); return n })
          }
        },
        undefined,
        () => {},
      )
    }

    return () => {
      cancelled = true
    }
  }, [urlKey])

  // Dispose all textures on final unmount
  useEffect(() => {
    return () => {
      setCache((prev) => {
        for (const tex of prev.values()) {
          if (tex) tex.dispose()
        }
        return new Map()
      })
    }
  }, [])

  return cache
}
