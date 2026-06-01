import { cva } from 'class-variance-authority'

const verifiedBadgeVariants = cva(
  'inline-flex items-center gap-1 font-semibold text-accent border rounded-sm uppercase tracking-wider',
  {
    variants: {
      size: {
        sm: 'text-[0.6rem] px-1.5 py-0.5',
        md: 'text-[0.65rem] px-2 py-0.5',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
}

function CheckIcon({ size }: { size: 'sm' | 'md' }) {
  const px = size === 'sm' ? 8 : 10
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function VerifiedBadge({ size = 'md' }: VerifiedBadgeProps) {
  return (
    <span
      className={verifiedBadgeVariants({ size })}
      style={{ borderColor: 'rgba(var(--accent-rgb),0.3)' }}
    >
      <CheckIcon size={size} />
      Verified
    </span>
  )
}
