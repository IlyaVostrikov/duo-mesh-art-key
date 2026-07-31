import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Disables scroll lock — use when nesting modals */
  noScrollLock?: boolean
}

export function Modal({ open, onClose, title, children, noScrollLock }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onKeyDown])

  // Scroll lock
  useEffect(() => {
    if (!open || noScrollLock) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, noScrollLock])

  // Temporarily disable global cursor:none while modal is open
  // (cursor inherits, so forcing !important on overlay kills pointer on buttons)
  useEffect(() => {
    if (!open) return
    const hadCustomCursor = document.documentElement.classList.contains('custom-cursor-active')
    if (hadCustomCursor) document.documentElement.classList.remove('custom-cursor-active')
    return () => {
      if (hadCustomCursor) document.documentElement.classList.add('custom-cursor-active')
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg)',
          borderRadius: 'var(--radius)',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--elev-2)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
