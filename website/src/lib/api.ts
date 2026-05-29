const API_BASE = 'http://localhost:3000'

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface ArtistPublic {
  id: string; userId: string; displayName: string | null; avatarUrl: string | null
  bio: string | null; location: string | null; artistStatement: string | null
  verified: boolean; tier: string; totalSalesCount: number
  hall: { slug: string; title: string; coverImageUrl: string | null; isPublished: boolean } | null
  followersCount: number; isFollowed?: boolean
}

export interface ArtworkPublic {
  id: string; title: string; description: string | null; year: number | null
  medium: string | null; dimensions: string | null; category: string
  styleTags: string[]; images: string[]
  isDigitalOriginal: boolean; isPhysicalDigitized: boolean; status: string
  price: string | null; currency: string; editionType: string
  editionTotal: number | null; viewCount: number
  artist: { id: string; displayName: string | null; avatarUrl: string | null; location: string | null; verified: boolean; hallSlug: string | null } | null
  artKey: { keyCode: string; ownerKey: string } | null
  latestProvenance: { transferType: string; toOwnerName: string | null; createdAt: string } | null
}

export interface ArtworkList { artworks: ArtworkPublic[]; total: number; page: number; pageSize: number }
export interface ArtistList { artists: ArtistPublic[]; total: number; page: number; pageSize: number }
export interface HallPublic { id: string; slug: string; title: string; description: string | null; coverImageUrl: string | null; theme: string | null; isPublished: boolean; viewCount: number; artist: { id: string; displayName: string | null; avatarUrl: string | null }; artworks: { id: string; title: string; images: string[]; category: string; price: string | null; currency: string; status: string }[] }
export interface ArtKeyVerification { artKey: { keyCode: string; ownerKey: string; artwork: { id: string; title: string; artistName: string | null } }; provenance: { transferType: string; toOwnerName: string | null; createdAt: string }[]; isValid: boolean; currentOwner: string | null }
export interface SearchResult { artworks: { id: string; title: string; artistName: string | null; images: string[]; category: string; price: string | null }[]; artists: { id: string; displayName: string | null; avatarUrl: string | null; hallSlug: string | null }[]; total: number; page: number }

export const api = {
  artists: {
    list: (page = 1, search?: string) =>
      fetchAPI<ArtistList>(`/api/artists?page=${page}&pageSize=12${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    get: (id: string) => fetchAPI<ArtistPublic>(`/api/artists/${id}`),
    getArtworks: (id: string, page = 1) =>
      fetchAPI<ArtworkList>(`/api/artists/${id}/artworks?page=${page}&pageSize=20`),
  },
  artworks: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams()
      if (params) Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v) })
      return fetchAPI<ArtworkList>(`/api/artworks?${qs.toString()}`)
    },
    get: (id: string) => fetchAPI<ArtworkPublic>(`/api/artworks/${id}`),
  },
  halls: {
    get: (slug: string) => fetchAPI<HallPublic>(`/api/halls/${slug}`),
  },
  artKeys: {
    verify: (keyCode: string) => fetchAPI<ArtKeyVerification>(`/api/art-keys/${keyCode}`),
  },
  search: {
    query: (q: string) => fetchAPI<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),
  },
  inquiries: {
    create: (body: { artworkId: string; fromName: string; fromEmail: string; message?: string }) =>
      fetchAPI<{ id: string }>('/api/inquiries', { method: 'POST', body: JSON.stringify(body) }),
  },
}
