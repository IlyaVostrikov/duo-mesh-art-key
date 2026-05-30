import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

interface VerifyResult {
  verified: boolean
  artwork: {
    id: string
    title: string
    description: string | null
    year: number | null
    medium: string | null
    posterUrl: string | null
    modelUrl: string | null
    mediaType: string
    status: string
    price: string | null
    currency: string
  }
  artist: {
    id: string
    displayName: string
    hallSlug: string | null
  }
  artKey: {
    keyCode: string
    integrityHash: string
    issuedAt: string
    revokedAt: string | null
  }
  provenance: Array<{
    sequence: number
    transferType: string
    fromOwnerName: string | null
    toOwnerName: string
    price: string | null
    recordHash: string
    prevRecordHash: string | null
    createdAt: string
  }>
  checks: Array<{ label: string; pass: boolean; detail: string }>
}

function parseBilingualTitle(title: string): [string, string] {
  const idx = title.lastIndexOf(' / ')
  if (idx === -1) return [title, title]
  return [title.slice(0, idx), title.slice(idx + 3)]
}

function parseBilingual(text: string): [string, string] {
  const sep = text.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
  const idx = text.indexOf(sep)
  if (idx === -1) return [text, text]
  return [text.slice(0, idx), text.slice(idx + sep.length)]
}

const TRANSFER_LABELS: Record<string, string> = {
  CREATION: 'Создание / Creation',
  PRIMARY_SALE: 'Первая продажа / Primary Sale',
  SECONDARY_SALE: 'Перепродажа / Secondary Sale',
  TRANSFER: 'Передача / Transfer',
  EXHIBITION: 'Выставка / Exhibition',
  CERTIFICATION: 'Сертификация / Certification',
}

// ─── Index: keyCode input ───
export function VerifyIndexPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    navigate({ to: '/verify/$keyCode', params: { keyCode: trimmed } })
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
      <RevealOnScroll direction="up">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '8px' }}>
          Art Key · Верификация
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={60}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Введите код сертификата для проверки подлинности / Enter certificate code to verify authenticity
        </p>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={120}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DUO-2026-XXXXXXXX"
            style={{
              width: '100%', padding: '14px 16px', fontSize: '1.125rem', fontFamily: 'monospace',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)', color: 'var(--text)',
              textAlign: 'center', letterSpacing: '0.05em', boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: '16px', padding: '12px 32px', fontSize: '0.9375rem', fontWeight: 600,
              backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
              border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            }}
          >
            Проверить / Verify
          </button>
        </form>
      </RevealOnScroll>
    </div>
  )
}

// ─── Result: /verify/:keyCode ───
export function VerifyResultPage() {
  const { keyCode } = useParams({ from: '/verify/$keyCode' })
  const [data, setData] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/art-keys/${encodeURIComponent(keyCode)}`)
      if (res.status === 404) { setError('NOT_FOUND'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [keyCode])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Not found ───
  if (error === 'NOT_FOUND') {
    return (
      <VerificationShell status="not-found" lang={lang}>
        <StatusBadge verified={false} labelRu="Не найдено" labelEn="Not Found" tone="gray" />
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
          Код <code style={{ fontFamily: 'monospace' }}>{keyCode}</code> не найден в реестре DUO MESH.<br />
          Проверьте правильность кода или обратитесь к художнику.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>
          Code not found in the DUO MESH registry.<br />
          Verify the code or contact the artist.
        </p>
        <Link to="/verify" style={{ display: 'inline-block', marginTop: '24px', color: 'var(--accent)' }}>
          ← Новый поиск / New search
        </Link>
      </VerificationShell>
    )
  }

  // ─── Loading ───
  if (loading) {
    return (
      <VerificationShell status="loading" lang={lang}>
        <div className="animate-pulse" style={{ height: '200px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)' }} />
      </VerificationShell>
    )
  }

  // ─── Error ───
  if (error || !data) {
    return (
      <VerificationShell status="error" lang={lang}>
        <p style={{ color: 'var(--text-secondary)' }}>Ошибка загрузки / Load error: {error}</p>
        <button onClick={fetchData} style={{ marginTop: '16px', color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}>
          Повторить / Retry
        </button>
      </VerificationShell>
    )
  }

  // ─── Verified / Broken ───
  const titleParts = parseBilingualTitle(data.artwork.title)
  const title = titleParts[lang === 'ru' ? 0 : 1]
  const descParts = data.artwork.description ? parseBilingual(data.artwork.description) : ['', '']
  const description = descParts[lang === 'ru' ? 0 : 1]

  return (
    <VerificationShell status={data.verified ? 'verified' : 'broken'} lang={lang}>
      {/* Status */}
      <RevealOnScroll direction="up">
        <StatusBadge
          verified={data.verified}
          labelRu={data.verified ? 'Подлинно' : 'Целостность нарушена'}
          labelEn={data.verified ? 'Authentic' : 'Integrity Broken'}
          tone={data.verified ? 'green' : 'red'}
          large
        />
      </RevealOnScroll>

      {/* Lang toggle */}
      <RevealOnScroll direction="up" delay={60}>
        <button
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          style={{
            marginTop: '16px', fontSize: '0.75rem', fontWeight: 500, padding: '4px 10px',
            backgroundColor: 'var(--surface)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </RevealOnScroll>

      {/* Poster */}
      {data.artwork.posterUrl && (
        <RevealOnScroll direction="up" delay={100}>
          <img
            src={data.artwork.posterUrl.startsWith('http') ? data.artwork.posterUrl : `${API_BASE}/${data.artwork.posterUrl.replace(/^\//, '')}`}
            alt={title}
            style={{ width: '100%', maxWidth: '400px', borderRadius: 'var(--radius)', marginTop: '24px' }}
          />
        </RevealOnScroll>
      )}

      {/* Title + Artist */}
      <RevealOnScroll direction="up" delay={120}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginTop: '24px', marginBottom: '4px' }}>
          {title}
        </h2>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={140}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', marginBottom: '8px' }}>
          {data.artist.displayName}
          {data.artist.hallSlug && (
            <Link to="/hall/$hallSlug" params={{ hallSlug: data.artist.hallSlug }} style={{ marginLeft: '8px', color: 'var(--accent)', fontSize: '0.875rem' }}>
              → {lang === 'ru' ? 'Зал' : 'Hall'}
            </Link>
          )}
        </p>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={160}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
          {[data.artwork.medium, data.artwork.year].filter(Boolean).join(' · ')}
        </p>
      </RevealOnScroll>

      {/* Description */}
      {description && (
        <RevealOnScroll direction="up" delay={180}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem', maxWidth: '540px', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
            {description}
          </p>
        </RevealOnScroll>
      )}

      {/* Key Code */}
      <RevealOnScroll direction="up" delay={200}>
        <div style={{
          padding: '16px', marginBottom: '16px', maxWidth: '540px', width: '100%',
          backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          textAlign: 'left',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
            {lang === 'ru' ? 'Ключ' : 'Key Code'}
          </span>
          <code style={{ fontFamily: 'monospace', fontSize: '1.125rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
            {data.artKey.keyCode}
          </code>
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <ArtKeyQR keyCode={data.artKey.keyCode} size={100} />
            <a
              href={`${API_BASE}/api/art-keys/${encodeURIComponent(data.artKey.keyCode)}/certificate.pdf`}
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
      </RevealOnScroll>

      {/* Integrity Hash */}
      <RevealOnScroll direction="up" delay={240}>
        <div style={{
          padding: '16px', marginBottom: '16px', maxWidth: '540px', width: '100%',
          backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          textAlign: 'left',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
            SHA-256 · Integrity Hash
          </span>
          <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {data.artKey.integrityHash}
          </code>
        </div>
      </RevealOnScroll>

      {/* Issued date */}
      <RevealOnScroll direction="up" delay={260}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '24px', maxWidth: '540px' }}>
          {lang === 'ru' ? 'Выдан' : 'Issued'}: {new Date(data.artKey.issuedAt).toLocaleDateString('ru-RU')}
          {data.artwork.status && ` · ${data.artwork.status}`}
          {data.artwork.price && ` · ${data.artwork.currency === 'RUB' ? `${Number(data.artwork.price).toLocaleString('ru-RU')} ₽` : `$${Number(data.artwork.price).toLocaleString('en-US')}`}`}
        </p>
      </RevealOnScroll>

      {/* Checks */}
      <RevealOnScroll direction="up" delay={280}>
        <div style={{ maxWidth: '540px', width: '100%', marginBottom: '24px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
            {lang === 'ru' ? 'Проверки' : 'Verification Checks'}
          </span>
          {data.checks.map((c, i) => (
            <div key={i} style={{
              padding: '8px 12px', marginBottom: '4px', borderRadius: 'var(--radius-sm)',
              backgroundColor: c.pass ? '#d4edda' : '#f8d7da',
              color: c.pass ? '#155724' : '#721c24',
              fontSize: '0.8125rem', fontFamily: 'monospace',
            }}>
              {c.pass ? '✓' : '✗'} {c.detail}
            </div>
          ))}
          {data.verified && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px', fontStyle: 'italic' }}>
              {lang === 'ru' ? 'Проверено пересчётом хешей' : 'Verified by hash recalculation'}
            </p>
          )}
        </div>
      </RevealOnScroll>

      {/* Provenance Chain */}
      {data.provenance && data.provenance.length > 0 && (
        <RevealOnScroll direction="up" delay={320}>
          <div style={{ maxWidth: '540px', width: '100%', marginBottom: '24px', textAlign: 'left' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
              Provenance · {lang === 'ru' ? 'Цепочка владения' : 'Ownership Chain'}
            </span>
            <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '16px' }}>
              {data.provenance.map((rec, idx) => (
                <div key={rec.sequence} style={{ paddingBottom: idx < data.provenance.length - 1 ? '16px' : '0', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '-22px', top: '4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: idx === 0 ? 'var(--accent)' : 'var(--text-muted)',
                  }} />
                  <p style={{ fontSize: '0.875rem', marginBottom: '2px', color: 'var(--text)' }}>
                    {rec.toOwnerName}
                    {rec.fromOwnerName && <span style={{ color: 'var(--text-secondary)' }}> ← {rec.fromOwnerName}</span>}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {TRANSFER_LABELS[rec.transferType] || rec.transferType} · {new Date(rec.createdAt).toLocaleDateString('ru-RU')}
                    {rec.price && ` · $${Number(rec.price).toLocaleString('en-US')}`}
                  </p>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.625rem', color: 'var(--text-muted)', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                    hash: {rec.recordHash.slice(0, 32)}...
                  </code>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      )}

      {/* Back to verify */}
      <RevealOnScroll direction="up" delay={360}>
        <Link to="/verify" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
          ← {lang === 'ru' ? 'Новая проверка' : 'New verification'}
        </Link>
      </RevealOnScroll>
    </VerificationShell>
  )
}

// ─── Shared shell ───
function VerificationShell({
  status: _status,
  lang: _lang,
  children,
}: {
  status: 'verified' | 'broken' | 'not-found' | 'loading' | 'error'
  lang: 'ru' | 'en'
  children: React.ReactNode
}) {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 20px 96px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {children}
    </div>
  )
}

// ─── Status badge ───
function StatusBadge({
  verified,
  labelRu,
  labelEn,
  tone,
  large,
}: {
  verified: boolean
  labelRu: string
  labelEn: string
  tone: 'green' | 'red' | 'gray'
  large?: boolean
}) {
  const bg = tone === 'green' ? '#d4edda' : tone === 'red' ? '#f8d7da' : '#e9ecef'
  const fg = tone === 'green' ? '#155724' : tone === 'red' ? '#721c24' : '#6c757d'
  const icon = tone === 'green' ? '✓' : tone === 'red' ? '✗' : '?'
  const fontSize = large ? '1.5rem' : '1.125rem'

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: large ? '16px 28px' : '8px 16px',
      backgroundColor: bg, color: fg, borderRadius: 'var(--radius)',
      fontSize, fontWeight: 700,
    }}>
      <span style={{ fontSize: large ? '1.75rem' : '1.25rem' }}>{icon}</span>
      <span>{verified ? `${labelRu} / ${labelEn}` : `${labelRu} / ${labelEn}`}</span>
    </div>
  )
}
