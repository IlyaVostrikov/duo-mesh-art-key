import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { apiBaseUrl } from '@/lib/api'

type InquiryCtx = {
  open: boolean
  setOpen: (v: boolean) => void
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  message: string; setMessage: (v: string) => void
  submitting: boolean
  toast: 'success' | 'error' | null
  setToast: (v: 'success' | 'error' | null) => void
  errorText: string
  setErrorText: (v: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  artistName: string
  artworkTitle: string
}

const InquiryContext = createContext<InquiryCtx | null>(null)

function useInquiry() {
  const ctx = useContext(InquiryContext)
  if (!ctx) throw new Error('Inquiry* must be used inside InquiryProvider')
  return ctx
}

export function InquiryProvider({
  artworkTitle,
  artworkId,
  artistName,
  children,
}: {
  artworkTitle: string
  artworkId: string
  artistName: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<'success' | 'error' | null>(null)
  const [errorText, setErrorText] = useState('')

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
    } catch (err: unknown) {
      setToast('error')
      setErrorText(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  const ctx: InquiryCtx = {
    open, setOpen, name, setName, email, setEmail, message, setMessage,
    submitting, toast, setToast, errorText, setErrorText, handleSubmit, artistName, artworkTitle,
  }

  return (
    <InquiryContext.Provider value={ctx}>
      {children}
    </InquiryContext.Provider>
  )
}

export function InquiryButton() {
  const { open, setOpen, setName, setEmail, setMessage, setToast, setErrorText, artistName, artworkTitle } = useInquiry()

  const defaultMessage = `Здравствуйте, меня интересует работа «${artworkTitle}» художника ${artistName}.`

  function handleOpen() {
    if (!open) {
      setName('')
      setEmail('')
      setMessage(defaultMessage)
      setToast(null)
      setErrorText('')
    }
    setOpen(!open)
  }

  return (
    <button
      onClick={handleOpen}
      className="w-full py-3 text-sm font-semibold mb-12"
      style={{
        backgroundColor: open ? 'var(--surface)' : 'var(--accent)',
        color: open ? 'var(--text)' : 'var(--accent-ink)',
        border: open ? '1px solid var(--border)' : 'none',
        borderRadius: 'var(--radius)', cursor: 'pointer',
        transition: `all var(--dur-fast) var(--ease)`,
      }}
    >
      {open ? 'Скрыть форму / Hide Form' : 'Связаться с художником / Contact Artist'}
    </button>
  )
}

export function InquiryFormInline() {
  const { open, setOpen, name, setName, email, setEmail, message, setMessage, submitting, toast, errorText, handleSubmit, artistName, artworkTitle } = useInquiry()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [open])

  if (!open) return null

  return (
    <div ref={formRef} style={{
      maxWidth: '1280px', margin: '0 auto', padding: '0 20px 96px',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '48px',
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <h2 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Связаться с художником / Contact Artist
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '32px' }}>
          {artistName} · «{artworkTitle}»
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <label style={{ display: 'block' }}>
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
                border: '1px solid var(--border)', backgroundColor: 'var(--bg)',
                color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box',
              }}
            />
          </label>

          <label style={{ display: 'block' }}>
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
                backgroundColor: 'var(--bg)', color: 'var(--text)',
                fontSize: '0.875rem', boxSizing: 'border-box',
              }}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: '24px' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Сообщение / Message
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', backgroundColor: 'var(--bg)',
              color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical',
              minHeight: '120px', boxSizing: 'border-box',
            }}
          />
        </label>

        {toast === 'success' && (
          <div style={{
            padding: '12px 16px', marginBottom: '16px', borderRadius: 'var(--radius-sm)',
            backgroundColor: '#d4edda', color: '#155724', fontSize: '0.875rem',
          }}>
            Запрос отправлен! Художник свяжется с вами. / Inquiry sent! The artist will contact you.
          </div>
        )}
        {toast === 'error' && errorText && (
          <div style={{
            padding: '12px 16px', marginBottom: '16px', borderRadius: 'var(--radius-sm)',
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
  )
}

// Kept for backwards compat — single-file usage with provider
export function InquiryForm(props: {
  artworkTitle: string
  artworkId: string
  artistName: string
}) {
  return (
    <InquiryProvider {...props}>
      <InquiryButton />
      <InquiryFormInline />
    </InquiryProvider>
  )
}
