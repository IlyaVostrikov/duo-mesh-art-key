import type { ReactNode } from 'react'

interface AuroraBackgroundProps {
  children: ReactNode
  /** Use radial mask to fade the aurora toward edges (default true) */
  masked?: boolean
  className?: string
}

export function AuroraBackground({ children, masked = true, className }: AuroraBackgroundProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(186, 194, 216, 0.48), transparent 55%), ' +
          'radial-gradient(ellipse 70% 50% at 78% 65%, rgba(205, 192, 214, 0.48), transparent 55%), ' +
          'radial-gradient(ellipse 60% 70% at 50% 40%, rgba(195, 193, 215, 0.32), transparent 70%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className={masked ? 'aurora-fx aurora-fx--masked' : 'aurora-fx'} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
