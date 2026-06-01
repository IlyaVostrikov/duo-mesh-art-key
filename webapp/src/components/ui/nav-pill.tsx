import { Link, useLocation } from '@tanstack/react-router'

interface NavPillProps {
  to: string
  label: string
}

export function NavPill({ to, label }: NavPillProps) {
  const loc = useLocation()
  const isActive = loc.pathname.startsWith(to)

  return (
    <Link
      to={to}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.82rem',
        fontWeight: isActive ? 600 : 400,
        letterSpacing: '-0.01em',
        color: isActive ? 'var(--text)' : 'var(--text-muted)',
        textDecoration: 'none',
        paddingBottom: '3px',
        borderBottom: isActive ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'color 150ms, border-color 150ms',
      }}
    >
      {label}
    </Link>
  )
}
