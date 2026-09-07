const CDN_BASE: string | undefined = import.meta.env.VITE_CDN_BASE_URL
const API_BASE: string | undefined = import.meta.env.VITE_API_URL

export function assetUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path)
      // Only this project's public upload bucket can use the configured CDN.
      // Signed URLs must keep their original host and query intact.
      if (CDN_BASE && parsed.origin === 'https://pub-04114982f6374eaa86b75d6cdb94fac2.r2.dev'
        && parsed.pathname.startsWith('/uploads/') && !parsed.search) {
        return `${CDN_BASE.replace(/\/$/, '')}${parsed.pathname}${parsed.hash}`
      }
    } catch { /* preserve the original URL */ }
    return path
  }
  if (CDN_BASE) return `${CDN_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    const base = API_BASE ?? 'http://localhost:3000'
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  }
  if (path.startsWith('/')) return path
  return `/${path}`
}
