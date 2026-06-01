import { useRef } from 'react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-label'?: string
}

export function SearchField({ value, onChange, placeholder, 'aria-label': ariaLabel }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="border-b border-border bg-transparent text-foreground outline-none transition-colors duration-[150ms] focus:border-accent"
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.8rem',
        padding: '4px 8px',
        width: '200px',
      }}
    />
  )
}
