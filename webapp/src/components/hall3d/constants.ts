import * as THREE from 'three'

// ─── Camera ───

export const FOV = 42
export const CAMERA_Z_FAR = 5.5
export const CAMERA_Z_NEAR = 1.2
export const LERP_SPEED = 4.5
export const MOUSE_YAW_DEG = 14
export const MOUSE_PITCH_DEG = 5

// ─── Input speeds ───

export const DOLLY_SPEED = 0.25
export const PAN_SPEED = 0.35

// ─── Transitions ───

export const TRANSITION_DURATION = 1.5

// ─── Lighting ───

export const AMBIENT_INTENSITY = 0.55
export const AMBIENT_COLOR = '#faf8f4'
export const HEMI_SKY_COLOR = '#ffffff'
export const HEMI_GROUND_COLOR = '#e8e4dc'
export const HEMI_INTENSITY = 0.4

// ─── Wall material ───

export const WALL_COLOR = '#f5f2eb'
export const WALL_ROUGHNESS = 0.93

// ─── Helpers ───

export function toRad(deg: number) { return THREE.MathUtils.degToRad(deg) }

export function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 }
