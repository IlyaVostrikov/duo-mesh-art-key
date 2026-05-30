import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

const VERIFY_BASE = import.meta.env?.VITE_PUBLIC_VERIFY_BASE ?? 'http://localhost:5173'

export function ArtKeyQR({ keyCode, size = 120 }: { keyCode: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const url = `${VERIFY_BASE}/verify/${encodeURIComponent(keyCode)}`
    QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: '#000', light: '#fff' } })
      .then((u) => { if (mountedRef.current) setDataUrl(u) })
      .catch(() => {})
    return () => { mountedRef.current = false }
  }, [keyCode, size])

  if (!dataUrl) return null

  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={dataUrl}
        alt={`QR: verify ${keyCode}`}
        style={{ width: size, height: size, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.625rem', marginTop: '4px' }}>
        Scan to verify / Отсканируйте для проверки
      </p>
    </div>
  )
}
