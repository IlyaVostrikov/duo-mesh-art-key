import { Link } from '@tanstack/react-router'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'

interface HubCardProps {
  to: string
  title: string
  description: string
  stat?: number
  statLabel?: string
}

export function HubCard({ to, title, description, stat, statLabel }: HubCardProps) {
  return (
    <Link
      to={to}
      className="block bg-background transition-colors duration-200 hover:bg-card"
      style={{ textDecoration: 'none' }}
    >
      <div style={{ padding: '32px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
            margin: '0 0 6px',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
        {stat !== undefined && (
          <div className="flex items-baseline gap-1.5 mt-5">
            <span
              className="text-display-sm"
              style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
            >
              <AnimatedCounter value={stat} />
            </span>
            {statLabel && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {statLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
