export {} // make this a module so `declare global` works

declare global {
  interface Window {
    api: ApiClient
  }
}

interface ApiClient {
  artists: {
    list: (page?: number, search?: string) => Promise<ArtistList>
    get: (id: string) => Promise<ArtistPublic>
    getArtworks: (id: string, page?: number) => Promise<ArtworkList>
  }
  artworks: {
    list: (params?: Record<string, string>) => Promise<ArtworkList>
    get: (id: string) => Promise<ArtworkPublic>
  }
  halls: {
    get: (slug: string) => Promise<HallPublic>
  }
  artKeys: {
    verify: (keyCode: string) => Promise<ArtKeyVerification>
  }
  search: {
    query: (q: string) => Promise<SearchResult>
  }
  inquiries: {
    create: (body: { artworkId: string; fromName: string; fromEmail: string; message?: string }) => Promise<{ id: string }>
  }
}

interface ArtistPublic {
  id: string; userId: string; displayName: string | null; avatarUrl: string | null
  bio: string | null; location: string | null; artistStatement: string | null
  verified: boolean; tier: string; totalSalesCount: number
  hall: { slug: string; title: string; coverImageUrl: string | null; isPublished: boolean } | null
  followersCount: number; isFollowed?: boolean
}

interface ArtworkPublic {
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

interface ArtworkList { artworks: ArtworkPublic[]; total: number; page: number; pageSize: number }
interface ArtistList { artists: ArtistPublic[]; total: number; page: number; pageSize: number }
interface HallPublic { id: string; slug: string; title: string; description: string | null; coverImageUrl: string | null; theme: string | null; isPublished: boolean; viewCount: number; artist: { id: string; displayName: string | null; avatarUrl: string | null }; artworks: { id: string; title: string; images: string[]; category: string; price: string | null; currency: string; status: string }[] }
interface ArtKeyVerification { artKey: { keyCode: string; ownerKey: string; artwork: { id: string; title: string; artistName: string | null } }; provenance: { transferType: string; toOwnerName: string | null; createdAt: string }[]; isValid: boolean; currentOwner: string | null }
interface SearchResult { artworks: { id: string; title: string; artistName: string | null; images: string[]; category: string; price: string | null }[]; artists: { id: string; displayName: string | null; avatarUrl: string | null; hallSlug: string | null }[]; total: number; page: number }
