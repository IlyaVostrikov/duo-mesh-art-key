const CDN_BASE = (import.meta as any).env?.VITE_CDN_BASE_URL as string | undefined

export function assetUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (CDN_BASE) return `${CDN_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  // Dev fallback: gradient placeholder keyed by path for visual distinctness
  const hue = hashString(path) % 360
  return svgPlaceholder(hue)
}

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function svgPlaceholder(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" style="stop-color:hsl(${hue},15%,12%)"/>
      <stop offset="100%" style="stop-color:hsl(${(hue + 30) % 360},10%,8%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <text x="400" y="500" text-anchor="middle" fill="hsl(${hue},5%,25%)" font-family="system-ui" font-size="14">DUO MESH</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
