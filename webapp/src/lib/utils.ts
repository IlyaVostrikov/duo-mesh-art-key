import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type HallTheme = 'default' | 'dark' | 'light' | 'warm' | 'cool'

const VALID_THEMES = new Set<string>(['default', 'dark', 'light', 'warm', 'cool'])

/** Coerce a raw theme string into the HallTheme union. Returns null for invalid/missing values. */
export function coerceTheme(theme: string | null | undefined): HallTheme | null {
  if (!theme) return null
  return VALID_THEMES.has(theme) ? (theme as HallTheme) : null
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

/** Inverse of parseBilingual: join RU + EN into seed format */
export function joinBilingual(ru: string, en: string): string {
  if (!en.trim()) return ru.trim()
  if (!ru.trim()) return en.trim()
  return `${ru.trim()}\n\n---\n\n${en.trim()}`
}

/** Inverse of parseBilingualTitle: join RU + EN with separator */
export function joinBilingualTitle(ru: string, en: string): string {
  if (!en.trim()) return ru.trim()
  if (!ru.trim()) return en.trim()
  return `${ru.trim()} / ${en.trim()}`
}

/** Format price for display: "1 234 ₽" or "$567". Returns null if price is falsy. */
export function formatPrice(price: string | number | null | undefined, currency = 'RUB'): string | null {
  if (price == null || price === '') return null
  const n = Number(price)
  if (isNaN(n)) return null
  return currency === 'RUB'
    ? `${n.toLocaleString('ru-RU')} ₽`
    : `$${n.toLocaleString('en-US')}`
}
