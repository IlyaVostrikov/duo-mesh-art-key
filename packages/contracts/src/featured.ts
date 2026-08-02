// Shared featured curation config — single source of truth for landing page
// Artwork/artist slugs from seed; IDs computed deterministically

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

  /** Artwork → artist slug mapping for deterministic ID resolution */
  artworkArtist: {
    'cosmic-drift': 'elena-volkova', 'silent-shores': 'elena-volkova',
    'crimson-pulse': 'elena-volkova', 'golden-thread': 'elena-volkova',
    'storm-front': 'elena-volkova', 'embers-of-form': 'elena-volkova',
    'neon-nocturne': 'maxim-drozdov', 'data-ghosts': 'maxim-drozdov',
    'anatomie-du-reve': 'maxim-drozdov', 'synthetic-garden': 'maxim-drozdov',
    'threshold': 'maxim-drozdov',
    'staircase-iii': 'anna-sokolova', 'winter-palace': 'anna-sokolova',
    'found-silence': 'anna-sokolova', 'metro-diptych': 'anna-sokolova',
    'afterimage': 'anna-sokolova',
    'letters-never-sent': 'daria-lys', 'map-of-departures': 'daria-lys',
    'archive-of-rain': 'daria-lys', 'fragments-of-light': 'daria-lys',
    'bronze-echo': 'viktor-iron', 'scanned-figure': 'viktor-iron',
    'digital-double': 'viktor-iron', 'frozen-gesture': 'viktor-iron',
    'lucid-dream': 'kira-nova', 'hybrid-flora': 'kira-nova',
    'portal-v2': 'kira-nova', 'glitch-portrait': 'kira-nova',
    'mesh-poem': 'kira-nova',
  } satisfies Record<string, string>,

  /** Artist slug → hall slug mapping (seed data correlation) */
  artistHall: {
    'elena-volkova': 'volkova-gallery', 'maxim-drozdov': 'drozdov-lab',
    'anna-sokolova': 'sokolova-chamber', 'daria-lys': 'lys-atelier',
    'viktor-iron': 'iron-forge', 'kira-nova': 'nova-nexus',
  } satisfies Record<string, string>,
} as const
