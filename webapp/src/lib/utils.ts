import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse seed bilingual format: RU text \n\n---\n\n EN text */
export function parseBilingual(text: string | null): [string, string] {
  if (!text) return ['', '']
  const sep = text.includes('\n\n---\n\n') ? '\n\n---\n\n' : '\n\n'
  const idx = text.indexOf(sep)
  if (idx === -1) return [text, text]
  const ru = text.slice(0, idx)
  const en = text.slice(idx + sep.length).replace(/^\n+/, '')
  return [ru, en || ru]
}

/** Parse "RU Title / EN Title" format used in seed titles */
export function parseBilingualTitle(title: string | null): [string, string] {
  if (!title) return ['', '']
  const idx = title.lastIndexOf(' / ')
  if (idx === -1) return [title, title]
  return [title.slice(0, idx), title.slice(idx + 3)]
}
