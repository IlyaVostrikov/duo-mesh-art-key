import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { ArtKeyQR } from '@/components/artwork/ArtKeyQR'
import { apiBaseUrl } from '@/lib/api'
import './certificate-print.css'

interface VerifyResult {
  verified: boolean
  artwork: {
    id: string
    title: string
    description: string | null
    year: number | null
    medium: string | null
    posterUrl: string | null
  }
  artist: { id: string; displayName: string }
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
    createdAt: string
  }>
  currentOwner: string | null
  verifyUrl: string
}

export function CertificatePage() {
  const { keyCode } = useParams({ from: '/certificate/$keyCode' })
  const isPrint = new URLSearchParams(window.location.search).get('print') === '1'

  const [data, setData] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/art-keys/${encodeURIComponent(keyCode)}`)
      if (res.status === 404) { setError('NOT_FOUND'); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [keyCode])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="cert-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>Загрузка сертификата...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="cert-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
        <p className="font-mono" style={{ color: 'var(--text-secondary)' }}>
          {error === 'NOT_FOUND' ? 'Сертификат не найден / Certificate not found' : `Ошибка: ${error}`}
        </p>
      </div>
    )
  }

  const issuedDate = new Date(data.artKey.issuedAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
  const title = data.artwork.title
  const posterSrc = data.artwork.posterUrl ?? null

  const currentOwner = data.currentOwner ?? data.artist.displayName
  const verifyUrl = data.verifyUrl

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/art-keys/${encodeURIComponent(data.artKey.keyCode)}/certificate.pdf`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DUO-MESH-${data.artKey.keyCode}-certificate.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed'
      setDownloadError(msg)
      setTimeout(() => setDownloadError(null), 4000)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="cert-screen">
      {/* ─── Download button (hidden in print) ─── */}
      {!isPrint && (
        <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 32px', padding: '0 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              fontSize: '0.8125rem', fontWeight: 600, cursor: downloading ? 'wait' : 'pointer',
              backgroundColor: 'var(--surface)', color: downloading ? 'var(--text-muted)' : 'var(--accent)',
              border: `1px solid ${downloading ? 'var(--border)' : 'var(--accent)'}`,
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.2s ease',
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? (
              <>
                <span className="cert-spinner" aria-hidden="true" />
                Загрузка PDF...
              </>
            ) : (
              '↓ PDF · Сертификат'
            )}
          </button>
          {downloadError && (
            <span style={{ fontSize: '0.75rem', color: 'var(--destructive, #d92d20)', fontWeight: 500 }}>
              Ошибка загрузки: {downloadError}
            </span>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PAGE 1: Masthead → Title → Body → Crypto
          ═══════════════════════════════════════════════════════ */}
      <div className="cert-page">
        {/* Masthead */}
        <div className="cert-masthead">
          <div className="cert-masthead-left">
            <div className="cert-glyph" aria-hidden="true">
              <span className="cert-glyph-outer" />
              <span className="cert-glyph-inner" />
            </div>
            <div className="cert-brand">
              <span className="cert-brand-name">DUO MESH</span>
              <span className="cert-brand-sub">ART KEY · PROVENANCE</span>
            </div>
          </div>
          <div className="cert-masthead-right">
            <span className="cert-doc-label">Certificate of Authenticity / Сертификат подлинности</span>
            <span className="cert-edition">1 / 1</span>
          </div>
          <hr className="cert-hairline" />
        </div>

        {/* Title */}
        <div className="cert-title">
          <span className="cert-kicker">Доказуемая подлинность произведения</span>
          <h1 className="cert-h1">
            <span className="cert-h1-ru">Сертификат</span>
            <span className="cert-h1-ru">подлинности</span>
          </h1>
          <span className="cert-h1-en">Certificate of Authenticity</span>
          <hr className="cert-hairline" />
        </div>

        {/* Body: artwork poster + registry */}
        <div className="cert-body">
          <div className="cert-artwork-frame">
            {posterSrc ? (
              <img src={posterSrc} alt={title} className="cert-poster" />
            ) : (
              <div className="cert-poster-placeholder">
                <span>Изображение работы</span>
              </div>
            )}
            <span className="cert-plate">«{title}» · {data.artist.displayName} · {data.artwork.year ?? '2026'}</span>
          </div>

          <div className="cert-registry">
            <div className="cert-registry-row">
              <span className="cert-reg-label">Работа / Artwork</span>
              <span className="cert-reg-value">{title}</span>
            </div>
            <div className="cert-registry-row">
              <span className="cert-reg-label">Художник / Artist</span>
              <span className="cert-reg-value">{data.artist.displayName}</span>
            </div>
            <div className="cert-registry-row">
              <span className="cert-reg-label">Владелец / Owner</span>
              <span className="cert-reg-value cert-reg-value--muted">{currentOwner}</span>
            </div>
            <div className="cert-registry-row">
              <span className="cert-reg-label">Тираж · техника / Edition · medium</span>
              <span className="cert-reg-value cert-reg-value--muted">{data.artwork.medium ?? 'Единственный экземпляр'} · 1 / 1</span>
            </div>
            <div className="cert-registry-row">
              <span className="cert-reg-label">Выдан / Issued</span>
              <span className="cert-reg-value">{issuedDate}</span>
            </div>
          </div>
        </div>

        {/* Crypto key block */}
        <div className="cert-key-block">
          <div className="cert-key-block-inner">
            <div className="cert-key-left">
              <span className="cert-key-section-label">Ключ / Key Code</span>
              <div className="cert-key-code-row">
                <span className="cert-key-icon" aria-hidden="true" />
                <code className="cert-key-code">{data.artKey.keyCode}</code>
              </div>
            </div>
            <div className="cert-key-divider" />
            <div className="cert-key-right">
              <span className="cert-key-section-label">SHA-256 Integrity Hash</span>
              <code className="cert-key-hash">
                <span>{data.artKey.integrityHash.slice(0, 36)}</span>
                <span>{data.artKey.integrityHash.slice(36)}</span>
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          PAGE 2: Guarantee → Provenance → Verify → Signatures → Closing
          ═══════════════════════════════════════════════════════ */}
      <div className="cert-page">
        {/* Guarantee: 3 pillars */}
        <div className="cert-guarantee">
          <span className="cert-section-kicker">Что подтверждает этот ключ</span>
          <div className="cert-pillars">
            <div className="cert-pillar">
              <span className="cert-pillar-num">01 — Подлинность</span>
              <h3 className="cert-pillar-heading">Оригинал, доказанный математикой</h3>
              <p className="cert-pillar-text">Работа сведена к единственному отпечатку SHA-256. Изменить его незаметно невозможно — это и есть доказательство оригинала, а не обещание.</p>
            </div>
            <div className="cert-pillar">
              <span className="cert-pillar-num">02 — Владение</span>
              <h3 className="cert-pillar-heading">Неразрывная история передач</h3>
              <p className="cert-pillar-text">Каждая смена владельца фиксируется и связывается с предыдущей записью. Цепочка от художника до вас не переписывается и не прерывается.</p>
            </div>
            <div className="cert-pillar">
              <span className="cert-pillar-num">03 — Проверка</span>
              <h3 className="cert-pillar-heading">Подтверждение за секунды</h3>
              <p className="cert-pillar-text">Один скан кода ниже открывает живую provenance-историю работы. Подлинность можно проверить в любой точке мира, не доверяя на слово.</p>
            </div>
          </div>
          <hr className="cert-hairline" />
        </div>

        {/* Provenance chain — always 3 nodes matching original design:
            genesis → current owner → future transfer */}
        <div className="cert-provenance">
          <span className="cert-section-kicker">Цепочка владения / Provenance</span>
          <div className="cert-provenance-nodes">
            {(() => {
              const genesis = data.provenance?.[0]
              const last = data.provenance?.[data.provenance.length - 1]
              const hasTransfer = (data.provenance?.length ?? 0) > 1
              const genHash = genesis?.recordHash
              const lastHash = last?.recordHash
              const nodes: Array<{ hash: string; role: string; sub: string; live: boolean; kind: 'artist' | 'acquirer' | 'future' }> = [
                { hash: genHash ? genHash.slice(0, 10) + '...' : '0x... · genesis',
                  role: 'Художник', sub: `${data.artist.displayName} · выпуск ключа`, live: true, kind: 'artist' },
                hasTransfer
                  ? { hash: lastHash ? lastHash.slice(0, 10) + '...' : '0x...',
                      role: 'Приобретатель', sub: 'текущий владелец', live: true, kind: 'acquirer' }
                  : { hash: '— · ожидает',
                      role: 'Приобретатель', sub: 'ожидает передачи', live: false, kind: 'acquirer' },
                { hash: '— · открыто',
                  role: 'Будущая передача', sub: 'цепочка продолжится', live: false, kind: 'future' },
              ]
              return nodes.map((n, i) => (
                <div key={i} className="cert-provenance-node">
                  <span className="cert-provenance-hash">{n.hash}</span>
                  <div className={`cert-provenance-medallion cert-medallion--${n.kind} ${!n.live ? 'is-future' : ''}`} />
                  <span className="cert-provenance-role">{n.role}</span>
                  <span className="cert-provenance-sub">{n.sub}</span>
                </div>
              ))
            })()}
          </div>
          <hr className="cert-hairline" />
        </div>

        {/* Verify: QR */}
        <div className="cert-verify">
          <span className="cert-section-kicker">Verify / Проверка</span>
          <div className="cert-verify-body">
            <div className="cert-qr-badge">
              <ArtKeyQR keyCode={data.artKey.keyCode} size={100} />
            </div>
            <div className="cert-verify-text">
              <p>Наведите камеру на код — откроется живая</p>
              <p>история владения этой работой.</p>
              <code className="cert-verify-url">{verifyUrl}</code>
            </div>
          </div>
          <hr className="cert-hairline" />
        </div>

        {/* Signatures */}
        <div className="cert-signatures">
          <div className="cert-signature-col">
            <hr className="cert-signature-line" />
            <span className="cert-signature-label">Художник / Artist</span>
            <span className="cert-signature-name">{data.artist.displayName}</span>
            <span className="cert-signature-detail">genesis-ключ · автор</span>
          </div>
          <div className="cert-signature-seal">
            <svg className="cert-seal-svg" viewBox="0 0 90 90" width="90" height="90" xmlns="http://www.w3.org/2000/svg">
              <circle cx="45" cy="45" r="44.5" fill="none" stroke="rgba(22,20,15,0.26)" strokeWidth="0.75" />
              <circle cx="45" cy="45" r="34.5" fill="none" stroke="rgba(22,20,15,0.16)" strokeWidth="0.75" />
              <circle cx="45" cy="45" r="12.5" fill="none" stroke="#16140f" strokeWidth="1.6" />
              <circle cx="45" cy="45" r="6" fill="#16140f" />
            </svg>
            <span className="cert-seal-text">· DUO MESH ART KEY · CRYPTOGRAPHICALLY SIGNED ·</span>
          </div>
          <div className="cert-signature-col cert-signature-col--right">
            <hr className="cert-signature-line" />
            <span className="cert-signature-label">Реестр / Registry</span>
            <span className="cert-signature-name">DUO MESH</span>
            <span className="cert-signature-detail">provenance authority</span>
          </div>
        </div>

        {/* Closing */}
        <div className="cert-closing">
          <hr className="cert-hairline cert-hairline--soft" />
          <div className="cert-closing-body">
            <span className="cert-verified-badge" aria-hidden="true">✓</span>
            <code className="cert-closing-text">VERIFIED BY DUO MESH ART KEY — CRYPTOGRAPHICALLY SIGNED PROVENANCE CHAIN</code>
            <code className="cert-closing-copy">© 2026 DUO MESH</code>
          </div>
        </div>
      </div>
    </div>
  )
}
