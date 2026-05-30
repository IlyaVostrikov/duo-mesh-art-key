const CDN_BASE = (import.meta as any).env?.VITE_CDN_BASE_URL as string | undefined
const API_BASE = (import.meta as any).env?.VITE_API_URL as string | undefined

export function assetUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (CDN_BASE) return `${CDN_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  // For uploaded files hosted on the API server
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    const base = API_BASE ?? 'http://localhost:3000'
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  }
  // Absolute paths are served by Vite static (public/) in dev, CDN in prod
  if (path.startsWith('/')) return path
  // Bare relative paths get a leading slash
  return `/${path}`
}
