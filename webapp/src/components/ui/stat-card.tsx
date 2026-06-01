import { AnimatedCounter } from '@/components/motion/AnimatedCounter'

interface StatCardProps {
  value: number
  suffix?: string
  label: string
}

export function StatCard({ value, suffix, label }: StatCardProps) {
  return (
    <div>
      <div
        className="text-display"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
      >
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '10px 0 0',
        }}
      >
        {label}
      </p>
    </div>
  )
}
