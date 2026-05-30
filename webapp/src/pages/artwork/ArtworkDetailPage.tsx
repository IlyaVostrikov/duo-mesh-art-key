import { useState, useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ModelViewer3D } from '@/components/artwork/ModelViewer3D'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { assetUrl } from '@/lib/asset-url'

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
  software: string | null
  isScanned: boolean
  polyCount: number | null
  status: string
  price: string | null
  currency: string
  artist: {
    id: string
    displayName: string
    avatarUrl: string | null
    hallSlug: string | null
  }
  artKey: ArtKey | null
  provenance: ProvenanceRecord[] | null
}

function parseBilingual(text: string): [string, string] {
  // Matches seed format (---) and bare \n\n (hall descriptions)
  const sep = text.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
  const idx = text.indexOf(sep)
  if (idx === -1) return [text, text]
  return [text.slice(0, idx), text.slice(idx + sep.length)]
}

function parseBilingualTitle(title: string): [string, string] {
  const idx = title.lastIndexOf(' / ')
  if (idx === -1) return [title, title]
  return [title.slice(0, idx), title.slice(idx + 3)]
}

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'
const TRANSFER_LABELS: Record<string, string> = {
  CREATION: 'Создание / Creation',
  PRIMARY_SALE: 'Первая продажа / Primary Sale',
  SECONDARY_SALE: 'Перепродажа / Secondary Sale',
  TRANSFER: 'Передача / Transfer',
  EXHIBITION: 'Выставка / Exhibition',
  CERTIFICATION: 'Сертификация / Certification',
}

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
    fetch(`${API_BASE}/api/artworks/${artworkId}`)
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

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 20px 96px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 420px',
        gap: '48px',
        alignItems: 'start',
      }}>
        {/* Media zone */}
        <div style={{
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg)',
          minHeight: is3D ? '70vh' : 'auto',
          boxShadow: 'var(--elev-1)',
        }}>
          {is3D && aw.modelUrl ? (
            <ModelViewer3D
              modelUrl={aw.modelUrl}
              posterUrl={aw.posterUrl ? assetUrl(aw.posterUrl) : undefined}
            />
          ) : (
            <img
              src={aw.posterUrl ? assetUrl(aw.posterUrl) : ''}
              alt={aw.title}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
        </div>

        {/* Info zone */}
        <div>
          {/* Breadcrumb */}
          {aw.artist.hallSlug && (
            <Link
              to="/hall/$hallSlug"
              params={{ hallSlug: aw.artist.hallSlug }}
              className="text-sm inline-block mb-6"
              style={{ color: 'var(--accent)', textDecoration: 'none', transition: `opacity var(--dur-fast) var(--ease)` }}
            >
              ← {aw.artist.displayName} / Зал
            </Link>
          )}

          <h1 className="text-display-sm" style={{ marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
            {titleMain}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginBottom: '24px' }}>
            {aw.artist.displayName}
          </p>

          {/* Status + Price */}
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
              <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
                {aw.currency === 'RUB'
                  ? `${Number(aw.price).toLocaleString('ru-RU')} ₽`
                  : `$${Number(aw.price).toLocaleString('en-US')}`}
              </span>
            )}
          </div>

          {/* 3D metadata */}
          {is3D && (
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
          )}

          {/* Description */}
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

          {/* Medium / Dimensions */}
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '32px' }}>
            {[aw.medium, aw.dimensions, aw.year].filter(Boolean).join(' · ')}
          </div>

          {/* CTA */}
          <ContactArtistCTA
            artworkTitle={titleMain}
            artworkId={aw.id}
            artistName={aw.artist.displayName}
          />

          {/* Art Key + Provenance */}
          {aw.artKey && (
            <section>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', marginBottom: '16px', color: 'var(--text)' }}>
                Art Key · Сертификат
              </h3>

              {/* Key Code */}
              <div className="p-4 mb-4" style={{
                backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  Ключ / Key Code
                </span>
                <code style={{ fontFamily: 'monospace', fontSize: '1.125rem', color: 'var(--accent)' }}>
                  {aw.artKey.keyCode}
                </code>
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <ArtKeyQR keyCode={aw.artKey.keyCode} size={100} />
                  <a
                    href={`${API_BASE}/api/art-keys/${encodeURIComponent(aw.artKey.keyCode)}/certificate.pdf`}
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
                <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
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
                        <code style={{
                          fontFamily: 'monospace', fontSize: '0.625rem', color: 'var(--text-muted)',
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
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Contact Artist CTA ───

function ContactArtistCTA({
  artworkTitle,
  artworkId,
  artistName,
}: {
  artworkTitle: string
  artworkId: string
  artistName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<'success' | 'error' | null>(null)
  const [errorText, setErrorText] = useState('')

  const defaultMessage = `Здравствуйте, меня интересует работа «${artworkTitle}» художника ${artistName}.`

  function handleOpen() {
    setName('')
    setEmail('')
    setMessage(defaultMessage)
    setToast(null)
    setErrorText('')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToast('error')
      setErrorText('Введите корректный email / Enter a valid email')
      return
    }

    setSubmitting(true)
    setToast(null)
    setErrorText('')

    try {
      const res = await fetch(`${API_BASE}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId,
          fromName: name.trim() || 'Гость / Guest',
          fromEmail: email.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setToast('success')
      setTimeout(() => setOpen(false), 1200)
    } catch (err: any) {
      setToast('error')
      setErrorText(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full py-3 text-sm font-semibold mb-12"
        style={{
          backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
          transition: `opacity var(--dur-fast) var(--ease)`,
        }}
      >
        Связаться с художником / Contact Artist
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)',
              padding: '32px', maxWidth: '480px', width: '100%',
              boxShadow: 'var(--elev-2)',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '24px' }}>
              Связаться с художником / Contact Artist
            </h2>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Имя / Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя / Your name"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                  color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box',
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Email *
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${toast === 'error' ? 'var(--error, #e74c3c)' : 'var(--border)'}`,
                  backgroundColor: 'var(--surface)', color: 'var(--text)',
                  fontSize: '0.875rem', boxSizing: 'border-box',
                }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '24px' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Сообщение / Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                  color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical',
                  minHeight: '100px', boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Toast */}
            {toast === 'success' && (
              <div style={{
                padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-sm)',
                backgroundColor: '#d4edda', color: '#155724', fontSize: '0.875rem',
              }}>
                Запрос отправлен! / Inquiry sent!
              </div>
            )}
            {toast === 'error' && errorText && (
              <div style={{
                padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-sm)',
                backgroundColor: '#f8d7da', color: '#721c24', fontSize: '0.875rem',
              }}>
                {errorText}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', backgroundColor: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Отмена / Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                  border: 'none', backgroundColor: 'var(--accent)',
                  color: 'var(--accent-ink)', fontSize: '0.875rem', fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Отправка... / Sending...' : 'Отправить / Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
