export function StatusBadge({
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
