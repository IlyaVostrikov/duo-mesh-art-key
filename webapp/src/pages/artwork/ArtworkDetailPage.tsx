import { useState, useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { InquiryForm } from '@/components/inquiry/InquiryForm'
import { FollowButton } from '@/components/FollowButton'
import { assetUrl } from '@/lib/asset-url'
import { apiBaseUrl } from '@/lib/api'

interface ProvenanceRecord {
  sequence: number
  transferType: string
  fromOwnerName: string | null
  toOwnerName: string
  price: string | null
  recordHash: string
  prevRecordHash: string | null
  createdAt: string
}

interface ArtKey {
  keyCode: string
  ownerKey: string
  integrityHash: string
  issuedAt: string
}

interface ArtworkDetail {
  id: string
  title: string
  description: string | null
  year: number | null
  medium: string | null
  dimensions: string | null
  category: string
  styleTags: string[]
  mediaType: 'IMAGE_2D' | 'MODEL_3D'
  posterUrl: string | null
  modelUrl: string | null
  usdzUrl: string | null
  software: string | null
  isScanned: boolean
  polyCount: number | null
  status: string
  price: string | null
  currency: string
  cameraOrbit: string | null
  cameraTarget: string | null
  artist: {
    id: string
    displayName: string
    avatarUrl: string | null
    hallSlug: string | null
    verified: boolean
  }
  artKey: ArtKey | null
  provenance: ProvenanceRecord[] | null
}

import { parseBilingual, parseBilingualTitle } from '@/lib/utils'
import { TRANSFER_LABELS } from '@/lib/labels'

export function ArtworkDetailPage() {
  const { artworkId } = useParams({ from: '/artwork/$artworkId' })
  const [aw, setAw] = useState<ArtworkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${apiBaseUrl}/api/artworks/${artworkId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'NOT_FOUND' : `HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => { if (!cancelled) setAw(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [artworkId])

  // ─── Loading ───
  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '48px' }}>
          <div className="animate-pulse bg-[var(--surface)]" style={{ borderRadius: 'var(--radius)', minHeight: '60vh' }} />
          <div className="space-y-4 pt-8">
            <div className="h-4 w-24 bg-[var(--surface)] rounded" />
            <div className="h-8 w-3/4 bg-[var(--surface)] rounded" />
            <div className="h-5 w-1/2 bg-[var(--surface)] rounded" />
            <div className="h-32 w-full bg-[var(--surface)] rounded mt-8" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Error ───
  if (error || !aw) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {error === 'NOT_FOUND' ? 'Работа не найдена / Artwork not found' : 'Ошибка загрузки / Load error'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>{error !== 'NOT_FOUND' ? error : ''}</p>
      </div>
    )
  }

  // ─── Content ───
  const is3D = aw.mediaType === 'MODEL_3D'
  const titleParts = parseBilingualTitle(aw.title)
  const titleMain = titleParts[lang === 'ru' ? 0 : 1]
  const descParts = aw.description ? parseBilingual(aw.description) : ['', '']
  const description = descParts[lang === 'ru' ? 0 : 1]

  // Per-piece camera & AR defaults
  const isSculpture = aw.category === 'SCULPTURE'
  const cameraOrbit = aw.cameraOrbit
    ?? (isSculpture ? '20deg 75deg 2m' : '30deg 75deg 2.5m')
  const cameraTarget = aw.cameraTarget ?? (isSculpture ? '0m 0.3m 0m' : undefined)
  const iosSrc = aw.usdzUrl ?? (aw.modelUrl ? aw.modelUrl.replace(/\.(glb|gltf)$/i, '.usdz') : undefined)

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: '48px',
        alignItems: 'start',
      }}>
        {/* Media zone */}
        <RevealOnScroll direction="up">
          <div
            data-lenis-prevent={is3D}
            style={{
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg)',
              height: is3D ? '70vh' : 'auto',
              minHeight: is3D ? '500px' : 'auto',
              boxShadow: 'var(--elev-1)',
            }}
          >
            {is3D && aw.modelUrl ? (
              <ModelViewer3D
                modelUrl={aw.modelUrl}
                posterUrl={aw.posterUrl ? assetUrl(aw.posterUrl) : undefined}
                cameraOrbit={cameraOrbit}
                cameraTarget={cameraTarget}
                iosSrc={iosSrc}
                arScale={isSculpture ? 'auto' : '150%'}
              />
            ) : (
              <img
                src={aw.posterUrl ? assetUrl(aw.posterUrl) : ''}
                alt={aw.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </div>
        </RevealOnScroll>

        {/* Info zone */}
        <div>
          {/* Breadcrumb */}
          {aw.artist.hallSlug && (
            <RevealOnScroll direction="up">
              <Link
                to="/hall/$hallSlug"
                params={{ hallSlug: aw.artist.hallSlug }}
                className="text-sm inline-block mb-6"
                style={{ color: 'var(--accent)', textDecoration: 'none', transition: `opacity var(--dur-fast) var(--ease)` }}
              >
                ← {aw.artist.displayName} / Зал
              </Link>
            </RevealOnScroll>
          )}

          <RevealOnScroll direction="up" delay={60}>
            <h1 className="text-display-sm" style={{ marginBottom: '8px' }}>
              {titleMain}
            </h1>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={100}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              {aw.artist.displayName}
              {aw.artist.verified && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.6rem', fontWeight: 600,
                  color: 'var(--accent)', border: '1px solid rgba(198,255,58,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '1px 6px',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
              )}
            </p>
          </RevealOnScroll>
          <RevealOnScroll direction="up" delay={120}>
            <div style={{ marginBottom: '16px' }}>
              <FollowButton artistId={aw.artist.id} size="sm" />
            </div>
          </RevealOnScroll>

          {/* Status + Price */}
          <RevealOnScroll direction="up" delay={140}>
            <div className="flex items-center gap-3 mb-8">
              {aw.status === 'SOLD' && (
                <span className="text-sm font-medium px-3 py-1" style={{
                  backgroundColor: 'var(--surface)', color: 'var(--text-muted)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  Продано / Sold
                </span>
              )}
              {aw.price && (
                <span className="font-display" style={{ fontSize: '1.5rem' }}>
                  {aw.currency === 'RUB'
                    ? `${Number(aw.price).toLocaleString('ru-RU')} ₽`
                    : `$${Number(aw.price).toLocaleString('en-US')}`}
                </span>
              )}
            </div>
          </RevealOnScroll>

          {/* 3D metadata */}
          {is3D && (
            <RevealOnScroll direction="up" delay={180}>
              <div className="grid grid-cols-2 gap-2 mb-8 p-4" style={{
                backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              }}>
                {aw.software && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Софт / Software</span>
                    <span style={{ fontSize: '0.875rem', textAlign: 'right' }}>{aw.software}</span>
                  </>
                )}
                {aw.polyCount && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Полигонов / Tris</span>
                    <span style={{ fontSize: '0.875rem', textAlign: 'right' }}>{(aw.polyCount / 1000).toFixed(0)}K</span>
                  </>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Скан / Scanned</span>
                <span style={{ fontSize: '0.875rem', textAlign: 'right' }}>{aw.isScanned ? 'Да / Yes' : 'Нет / No'}</span>
              </div>
            </RevealOnScroll>
          )}

          {/* Description */}
          <RevealOnScroll direction="up" delay={200}>
            <div style={{ marginBottom: '32px' }}>
              <button
                onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
                className="text-xs font-medium px-2 py-0.5 mb-3"
                style={{
                  backgroundColor: 'var(--surface)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                }}
              >
                {lang === 'ru' ? 'EN' : 'RU'}
              </button>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
                {description}
              </p>
            </div>
          </RevealOnScroll>

          {/* Medium / Dimensions */}
          <RevealOnScroll direction="up" delay={240}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '32px' }}>
              {[aw.medium, aw.dimensions, aw.year].filter(Boolean).join(' · ')}
            </div>
          </RevealOnScroll>

          {/* CTA */}
          <RevealOnScroll direction="up" delay={280}>
            <InquiryForm
              artworkTitle={titleMain}
              artworkId={aw.id}
              artistName={aw.artist.displayName}
            />
          </RevealOnScroll>

          {/* Art Key + Provenance */}
          {aw.artKey && (
            <RevealOnScroll direction="up" delay={320}>
              <section>
                <h3 className="font-display" style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--text)' }}>
                  Art Key · Сертификат
                </h3>

                {/* Key Code */}
                <div className="p-4 mb-4" style={{
                  backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                    Ключ / Key Code
                  </span>
                  <code className="font-mono" style={{ fontSize: '1.125rem', color: 'var(--accent)' }}>
                    {aw.artKey.keyCode}
                  </code>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <ArtKeyQR keyCode={aw.artKey.keyCode} size={100} />
                    <a
                      href={`${apiBaseUrl}/api/art-keys/${encodeURIComponent(aw.artKey.keyCode)}/certificate.pdf`}
                      download
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600,
                        backgroundColor: 'var(--surface)', color: 'var(--accent)',
                        border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none', cursor: 'pointer',
                      }}
                    >
                      ↓ PDF · Сертификат
                    </a>
                  </div>
                </div>

                {/* Integrity Hash */}
                <div className="p-4 mb-4" style={{
                  backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                    SHA-256 / Integrity Hash
                  </span>
                  <code className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    {aw.artKey.integrityHash}
                  </code>
                </div>

                {/* Provenance Chain */}
                {aw.provenance && aw.provenance.length > 0 && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                      Provenance · Цепочка владения
                    </span>
                    <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '16px' }}>
                      {aw.provenance.map((rec, idx) => (
                        <div key={rec.sequence} style={{
                          paddingBottom: idx < aw.provenance!.length - 1 ? '16px' : '0',
                          position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', left: '-22px', top: '4px',
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: idx === 0 ? 'var(--accent)' : 'var(--text-muted)',
                          }} />
                          <p style={{ fontSize: '0.875rem', marginBottom: '2px' }}>
                            <span style={{ color: 'var(--text)' }}>{rec.toOwnerName}</span>
                            {' ← '}
                            {rec.fromOwnerName ? (
                              <span style={{ color: 'var(--text-secondary)' }}>{rec.fromOwnerName}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Genesis</span>
                            )}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {TRANSFER_LABELS[rec.transferType] || rec.transferType} · {new Date(rec.createdAt).toLocaleDateString('ru-RU')}
                            {rec.price && ` · $${Number(rec.price).toLocaleString('en-US')}`}
                          </p>
                          <code className="font-mono" style={{
                            fontSize: '0.625rem', color: 'var(--text-muted)',
                            wordBreak: 'break-all', display: 'block', marginTop: '4px',
                          }}>
                            hash: {rec.recordHash.slice(0, 32)}...
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </RevealOnScroll>
          )}
        </div>
      </div>
    </div>
  )
}



