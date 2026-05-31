import { type ReactNode } from "react"

const gapMap = {
  sm: "space-y-4",
  default: "space-y-6",
  md: "space-y-10",
  lg: "space-y-14",
  xl: "space-y-20",
} as const

export default function Stack({
  children,
  gap = "default",
  className = "",
}: {
  children: ReactNode
  gap?: keyof typeof gapMap
  className?: string
}) {
  return <div className={`${gapMap[gap]} ${className}`}>{children}</div>
}
