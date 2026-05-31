import { type ReactNode } from "react"

type ColsSpec = number | { sm?: number; md?: number; lg?: number }

function colsClass(cols: ColsSpec): string {
  if (typeof cols === "number") return `grid-cols-${cols}`
  const parts: string[] = []
  if (cols.sm) parts.push(`sm:grid-cols-${cols.sm}`)
  if (cols.md) parts.push(`md:grid-cols-${cols.md}`)
  if (cols.lg) parts.push(`lg:grid-cols-${cols.lg}`)
  return parts.length > 0 ? `grid-cols-1 ${parts.join(" ")}` : "grid-cols-1"
}

const gapMap = {
  sm: "gap-4",
  default: "gap-6",
  md: "gap-8",
  lg: "gap-12",
} as const

export default function Grid({
  children,
  cols = 1,
  gap = "default",
  className = "",
}: {
  children: ReactNode
  cols?: ColsSpec
  gap?: keyof typeof gapMap
  className?: string
}) {
  return (
    <div className={`grid ${colsClass(cols)} ${gapMap[gap]} ${className}`}>
      {children}
    </div>
  )
}
