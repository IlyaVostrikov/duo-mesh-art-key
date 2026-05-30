// Shared featured curation config — single source of truth for landing page
// Hardcoded artwork/artist slugs from seed; IDs computed deterministically

export const FEATURED_CONFIG = {
  /** Hero 3D artwork — the single model-viewer piece on the landing page */
  heroArtworkSlug: 'digital-double',

  /** Curated 6–8 artworks for the featured grid (mix 2D + 3D, different artists) */
  featuredArtworkSlugs: [
    'anatomie-du-reve',   // Maxim Drozdov — Renaissance anatomy + glitch, SOLD
    'golden-thread',      // Elena Volkova — elegant gold-line abstract
    'threshold',          // Maxim Drozdov — photogrammetry scan, glitch waves
    'cosmic-drift',       // Elena Volkova — flagship large-scale abstract
    'portal-v2',          // Kira Nova — 3D interactive AR concept
    'bronze-echo',        // Viktor Iron — 3D digital sculpture
    'metro-diptych',      // Anna Sokolova — monochrome photography
    'fragments-of-light', // Daria Lys — mixed media collage
  ],

  /** Curated 3–4 artists for the featured artists section */
  featuredArtistSlugs: [
    'elena-volkova',
    'maxim-drozdov',
    'viktor-iron',
    'kira-nova',
  ],
} as const
