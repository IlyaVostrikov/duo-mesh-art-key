import { type ReactNode, createElement } from "react"

type SemanticTag = "section" | "footer" | "header" | "div"

const paddingYMap = {
  sm: "py-12",
  default: "py-16",
  lg: "py-20",
  none: "",
} as const

type BorderVariant = "none" | "top" | "both"

const borderMap: Record<BorderVariant, string> = {
  none: "",
  top: "border-t border-border/50",
  both: "border-y border-border/50",
}

type BackgroundVariant = "none" | "surface"

const bgMap: Record<BackgroundVariant, string> = {
  none: "",
  surface: "bg-surface/50",
}

export default function Section({
  children,
  as: tag = "section",
  paddingY = "default",
  border = "none",
  background = "none",
  className = "",
}: {
  children: ReactNode
  as?: SemanticTag
  paddingY?: keyof typeof paddingYMap
  border?: BorderVariant
  background?: BackgroundVariant
  className?: string
}) {
  return createElement(
    tag,
    { className: `${paddingYMap[paddingY]} ${borderMap[border]} ${bgMap[background]} ${className}`.trim() },
    children
  )
}
