interface HubGridProps {
  children: React.ReactNode
}

/** 2-column bordered grid — the background colour becomes the 1px gap line */
export function HubGrid({ children }: HubGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1px',
        background: 'var(--border)',
      }}
    >
      {children}
    </div>
  )
}
