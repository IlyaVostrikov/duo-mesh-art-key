/*
  DESIGN V2 — LandingHero
  Заменяет: src/pages/landing/LandingHero.tsx

  Изменения:
  - Убраны ParticleField и cursor spotlight
  - Убраны анимации float и breathe
  - Заголовок переведён в Cormorant editorial — более галерейный
  - Разметка: строгая двухколоночная сетка с вертикальным разделителем
  - Изображение без boxy-рамки — от края до края, как экспонат
*/
import { Link } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { parseBilingualTitle } from '@/lib/utils'
import { assetUrl } from '@/lib/asset-url'

interface HeroProps {
  heroWork: {
    id: string
    title: string
    artist: { displayName: string; hallSlug: string | null }
    posterUrl: string
    modelUrl: string | null
    mediaType: 'IMAGE_2D' | 'MODEL_3D'
    medium: string | null
  } | null
  lang: 'ru' | 'en'
}

export function LandingHero({ heroWork, lang }: HeroProps) {
  const [artworkRu] = heroWork ? parseBilingualTitle(heroWork.title) : ['']
  const artworkTitle = artworkRu

  return (
    <section
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
      }}
    >
      {/* Верхняя подпись — как в галерее */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '12px',
          paddingBottom: '64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Платформа верифицированного цифрового искусства
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          2026
        </span>
      </div>

      {/* Главная сетка */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1px 1fr',
          gap: '0 48px',
          alignItems: 'start',
          paddingBottom: '80px',
        }}
      >
        {/* Левая колонка — текст */}
        <div style={{ display: 'grid', gap: '40px' }}>
          {/* Editorial заголовок */}
          <div>
            <h1
              className="text-editorial-hero"
              style={{ color: 'var(--text)', margin: 0 }}
            >
              Цифровое искусство
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>с доказуемой</span>
              <br />
              подлинностью
            </h1>
          </div>

          <Typography
            variant="body"
            tone="muted"
            style={{
              fontFamily: 'var(--font-editorial)',
              fontSize: '1.2rem',
              lineHeight: 1.65,
              maxWidth: '480px',
            }}
          >
            Виртуальные 3D-галереи, SHA-256 ArtKey-сертификаты
            и provenance-цепочки — платформа для художников
            и коллекционеров нового поколения.
          </Typography>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button asChild size="lg">
              <Link to="/gallery">Смотреть галерею</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/verify">Проверить сертификат</Link>
            </Button>
          </div>

          {heroWork && artworkTitle && (
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                Избранная работа
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Link
                  to="/artwork/$artworkId"
                  params={{ artworkId: heroWork.id }}
                  style={{
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-editorial)',
                    fontSize: '1.1rem',
                    fontStyle: 'italic',
                  }}
                >
                  {artworkTitle}
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  —
                </span>
                <Link
                  to="/hall/$hallSlug"
                  params={{ hallSlug: heroWork.artist.hallSlug ?? '' }}
                  style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  {heroWork.artist.displayName}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Вертикальный разделитель */}
        <div style={{ background: 'var(--border)', height: '100%', minHeight: '500px' }} />

        {/* Правая колонка — произведение */}
        <div style={{ position: 'relative' }}>
          {heroWork && heroWork.mediaType === 'MODEL_3D' && heroWork.modelUrl ? (
            <div
              style={{ height: '75vh', minHeight: '520px' }}
              data-lenis-prevent
            >
              <ModelViewer3D
                modelUrl={heroWork.modelUrl}
                posterUrl={assetUrl(heroWork.posterUrl)}
                iosSrc={heroWork.modelUrl.replace(/\.(glb|gltf)$/i, '.usdz')}
              />
            </div>
          ) : heroWork ? (
            <div style={{ height: '75vh', minHeight: '520px', overflow: 'hidden' }}>
              <img
                src={assetUrl(heroWork.posterUrl)}
                alt={artworkTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                height: '75vh',
                minHeight: '520px',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography tone="muted">Загрузка...</Typography>
            </div>
          )}

          {/* Подпись под работой — стиль музейной этикетки */}
          {heroWork && (
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-editorial)',
                    fontStyle: 'italic',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  {heroWork.artist.displayName}
                </p>
                {heroWork.medium && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      margin: '2px 0 0',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {heroWork.medium}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {heroWork.mediaType === 'MODEL_3D' ? '3D' : '2D'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Нижняя строка-разделитель */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0' }} />
    </section>
  )
}
