import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'

// React 19 strict JSX.Element types are incompatible with @react-three/postprocessing's
// children signatures. We bridge the gap here so always-on effects compile cleanly.
const EffectComposerCompat = EffectComposer as React.ComponentType<{
  enabled?: boolean
  children?: React.ReactNode
  depthBuffer?: boolean
  enableNormalPass?: boolean
  stencilBuffer?: boolean
  autoClear?: boolean
  resolutionScale?: number
  multisampling?: number
  renderPriority?: number
}>

interface PostProcessOverlayProps {
  bloomIntensity?: number
  bloomThreshold?: number
  bloomRadius?: number
  chromaticOffsetX?: number
  chromaticOffsetY?: number
}

export function PostProcessOverlay({
  bloomIntensity = 0.3,
  bloomThreshold = 0.9,
  bloomRadius = 0.15,
  chromaticOffsetX = 0.0005,
  chromaticOffsetY = 0.0005,
}: PostProcessOverlayProps) {
  return (
    <EffectComposerCompat multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomRadius}
        mipmapBlur={false}
      />

      <ChromaticAberration
        offset={[chromaticOffsetX, chromaticOffsetY]}
      />

      <Vignette
        offset={0.15}
        darkness={0.35}
        eskil={false}
      />

      <Noise
        premultiply
        opacity={0.012}
      />
    </EffectComposerCompat>
  )
}
