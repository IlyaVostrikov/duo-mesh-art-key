import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { Typography } from '@/components/ui/typography'

const MODEL_URL = '/models/mosquito_in_amber/scene.gltf'
const POSTER_URL = '/models/mosquito_in_amber/textures/material_baseColor.jpeg'

export function LandingSeatedFigure({ lang }: { lang: 'ru' | 'en' }) {
  return (
    <section className="relative w-screen -mx-[calc((100vw-100%)/2)]">
      <div className="relative w-full h-[90vh] bg-black">
        <ModelViewer3D
          modelUrl={MODEL_URL}
          posterUrl={POSTER_URL}
          exposure={1.4}
          disableZoom
        />

        {/* Label overlay — bottom-left */}
        <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-1 pointer-events-none">
          <Typography
            variant="caption"
            className="uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {lang === 'ru' ? 'Избранная 3D-модель' : 'Featured 3D Model'}
          </Typography>
          <Typography
            variant="h3"
            className="text-xl"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {lang === 'ru'
              ? 'Комар в янтаре'
              : 'Mosquito in Amber'}
          </Typography>
          <Typography
            variant="caption"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {lang === 'ru'
              ? 'Ископаемое в янтаре · CC0'
              : 'Amber fossil · CC0'}
          </Typography>
        </div>
      </div>
    </section>
  )
}
