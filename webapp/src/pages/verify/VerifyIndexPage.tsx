import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

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
        <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '8px' }}>
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
            className="font-mono"
            style={{
              width: '100%', padding: '14px 16px', fontSize: '1.125rem',
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
