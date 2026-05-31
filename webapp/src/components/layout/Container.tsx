import { type ReactNode } from "react"

const sizeMap = {
  default: "max-w-6xl",
  narrow: "max-w-4xl",
  wide: "max-w-7xl",
  full: "",
} as const

const paddingMap = {
  default: "px-5",
  none: "",
} as const

export default function Container({
  children,
  size = "default",
  padding = "default",
}: {
  children: ReactNode
  size?: keyof typeof sizeMap
  padding?: keyof typeof paddingMap
}) {
  return (
    <div className={`mx-auto w-full ${sizeMap[size]} ${paddingMap[padding]}`}>
      {children}
    </div>
  )
}
