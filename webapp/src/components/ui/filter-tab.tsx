import { cva } from 'class-variance-authority'

const filterTabVariants = cva(
  'border-b bg-transparent cursor-pointer transition-[color,border-color] duration-[150ms]',
  {
    variants: {
      active: {
        true: 'border-accent text-foreground',
        false: 'border-transparent text-muted-foreground',
      },
    },
    defaultVariants: { active: false },
  },
)

interface FilterTabProps {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function FilterTab({ active = false, onClick, children }: FilterTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={filterTabVariants({ active })}
      style={{
        padding: '4px 14px 12px',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </button>
  )
}
