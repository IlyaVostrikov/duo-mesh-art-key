export interface HallCustomization {
  wallTheme?: 'default' | 'dark' | 'warm' | 'cool' | 'custom'
  wallColor?: string
  floorType?: 'wood' | 'marble' | 'concrete' | 'darkWood' | 'parquet'
  frameStyle?: 'classic' | 'modern' | 'ornate' | 'minimal' | 'floating'
  lightingPreset?: 'warm' | 'cool' | 'neutral' | 'dramatic'
  accentLight?: 'none' | 'blue' | 'purple' | 'gold' | 'green'
  pedestalStyle?: 'marble' | 'wood' | 'metal' | 'concrete'
  roomShape?: 'rectangle' | 'wide' | 'deep' | 'lShape'
  ceilingStyle?: 'flat' | 'coffered' | 'vaulted'
}

export const DEFAULT_CUSTOMIZATION: Required<Omit<HallCustomization, 'wallColor'>> = {
  wallTheme: 'default',
  floorType: 'wood',
  frameStyle: 'classic',
  lightingPreset: 'warm',
  accentLight: 'none',
  pedestalStyle: 'marble',
  roomShape: 'rectangle',
  ceilingStyle: 'flat',
}

// ─── Floor material presets ───

export const FLOOR_PRESETS: Record<string, { color: string; roughness: number; metalness: number }> = {
  wood:     { color: '#c4a87c', roughness: 0.7, metalness: 0.05 },
  marble:   { color: '#e8e0d8', roughness: 0.25, metalness: 0.1 },
  concrete: { color: '#b0aaa2', roughness: 0.95, metalness: 0 },
  darkWood: { color: '#5c3d2e', roughness: 0.6, metalness: 0.05 },
  parquet:  { color: '#d4a96a', roughness: 0.55, metalness: 0.08 },
}

// ─── Frame style presets ───

export const FRAME_PRESETS: Record<string, { color: string; hoverColor: string; roughness: number; metalness: number; thickness: number }> = {
  classic:  { color: '#8b7355', hoverColor: '#c4a060', roughness: 0.4, metalness: 0.3, thickness: 0.04 },
  modern:   { color: '#2a2a2a', hoverColor: '#555555', roughness: 0.2, metalness: 0.8, thickness: 0.025 },
  ornate:   { color: '#d4a84b', hoverColor: '#f0d078', roughness: 0.3, metalness: 0.6, thickness: 0.055 },
  minimal:  { color: '#e8e4dc', hoverColor: '#ffffff', roughness: 0.5, metalness: 0.1, thickness: 0.018 },
  floating: { color: 'transparent', hoverColor: 'transparent', roughness: 1, metalness: 0, thickness: 0 },
}

// ─── Lighting presets ───

export const LIGHTING_PRESETS: Record<string, { ambientColor: string; ambientIntensity: number; hemiSky: string; hemiGround: string; hemiIntensity: number; spotlightColor: string }> = {
  warm:     { ambientColor: '#faf8f4', ambientIntensity: 0.55, hemiSky: '#ffffff', hemiGround: '#e8e4dc', hemiIntensity: 0.4,  spotlightColor: '#fffaf0' },
  cool:     { ambientColor: '#f0f4f8', ambientIntensity: 0.45, hemiSky: '#e8f0ff', hemiGround: '#c8d0d8', hemiIntensity: 0.35, spotlightColor: '#f0f4ff' },
  neutral:  { ambientColor: '#f5f5f5', ambientIntensity: 0.6,  hemiSky: '#ffffff', hemiGround: '#cccccc', hemiIntensity: 0.45, spotlightColor: '#ffffff' },
  dramatic: { ambientColor: '#1a1a20', ambientIntensity: 0.2,  hemiSky: '#2a2a35', hemiGround: '#0a0a10', hemiIntensity: 0.18, spotlightColor: '#fff8e8' },
}

// ─── Accent light presets ───

export const ACCENT_PRESETS: Record<string, { color: string; intensity: number }> = {
  none:   { color: '#000000', intensity: 0 },
  blue:   { color: '#4488ff', intensity: 1.2 },
  purple: { color: '#aa55ff', intensity: 1.0 },
  gold:   { color: '#ffcc66', intensity: 1.4 },
  green:  { color: '#44dd88', intensity: 1.0 },
}

// ─── Pedestal presets ───

export const PEDESTAL_PRESETS: Record<string, { color: string; roughness: number; metalness: number }> = {
  marble:   { color: '#e8e0d8', roughness: 0.25, metalness: 0.05 },
  wood:     { color: '#c4a87c', roughness: 0.65, metalness: 0.05 },
  metal:    { color: '#3a3a3a', roughness: 0.2,  metalness: 0.9 },
  concrete: { color: '#b0aaa2', roughness: 0.9,  metalness: 0 },
}

// ─── Room shape dimensions (relative to default wall width W, floor depth D) ───
// rectangle: W×D, wide: 1.4W×0.85D, deep: 0.8W×1.25D, lShape: W×D with cutout

export const ROOM_SHAPE_SCALES: Record<string, { widthScale: number; depthScale: number }> = {
  rectangle: { widthScale: 1.0, depthScale: 1.0 },
  wide:      { widthScale: 1.4, depthScale: 0.85 },
  deep:      { widthScale: 0.8, depthScale: 1.25 },
  lShape:    { widthScale: 1.0, depthScale: 1.0 },
}
