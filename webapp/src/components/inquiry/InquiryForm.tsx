import { useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

export function InquiryForm({
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setToast('error')
      setErrorText('Введите корректный email / Enter a valid email')
      return
    }

    setSubmitting(true)
    setToast(null)
    setErrorText('')

    try {
      const res = await fetch(`${apiBaseUrl}/api/inquiries`, {
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
            <h2 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '24px' }}>
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
