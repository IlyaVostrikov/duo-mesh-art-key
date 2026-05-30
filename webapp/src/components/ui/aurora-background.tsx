import type { ReactNode } from 'react'

interface AuroraBackgroundProps {
  children: ReactNode
  /** Use radial mask to fade the aurora toward edges (default true) */
  masked?: boolean
  className?: string
}

export function AuroraBackground({ children, masked = true, className }: AuroraBackgroundProps) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} className={className}>
      <div className={masked ? 'aurora-fx aurora-fx--masked' : 'aurora-fx'} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
