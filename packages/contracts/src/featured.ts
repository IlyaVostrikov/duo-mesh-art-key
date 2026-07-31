// Shared featured curation config — single source of truth for landing page
// Hardcoded artwork/artist slugs from seed; IDs computed deterministically

export const FEATURED_CONFIG = {
  /** Hero 3D artwork — the single model-viewer piece on the landing page */
  heroArtworkSlug: 'cosmic-drift',

  /** Curated 6–8 artworks for the featured grid (mix 2D + 3D, different artists) */
  featuredArtworkSlugs: [
    'anatomie-du-reve',   // Maxim Drozdov — Renaissance anatomy + glitch, SOLD
    'golden-thread',      // Elena Volkova — elegant gold-line abstract
    'threshold',          // Maxim Drozdov — photogrammetry scan, glitch waves
    'cosmic-drift',       // Elena Volkova — flagship large-scale abstract
    'data-ghosts',        // Maxim Drozdov — generative art
    'metro-diptych',      // Anna Sokolova — monochrome photography
    'fragments-of-light', // Daria Lys — mixed media collage
  ],

  /** Curated 3–4 artists for the featured artists section */
  featuredArtistSlugs: [
    'elena-volkova',
    'maxim-drozdov',
    'kira-nova',
    'anna-sokolova',
  ],
} as const
