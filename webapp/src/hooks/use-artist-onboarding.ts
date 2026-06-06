import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { apiBaseUrl } from '@/lib/api'
import { joinBilingual, joinBilingualTitle } from '@/lib/utils'

export interface OnboardingProfile {
  titleRu: string
  titleEn: string
  statementRu: string
  statementEn: string
  hallDescRu: string
  hallDescEn: string
  location: string
  websiteUrl: string
  avatarFile: File | null
  lang: 'ru' | 'en'
}

export interface CreatedArtist {
  id: string
  hall: { slug: string; title: string }
  displayName: string | null
}

export function useArtistOnboarding() {
  const auth = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append('files', file)
    const res = await fetch(`${apiBaseUrl}/api/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken!}` },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message ?? 'Upload failed')
    }
    const data = await res.json()
    return data.files?.[0]?.url ?? null
  }

  async function createProfile(values: OnboardingProfile): Promise<CreatedArtist> {
    setError(null)

    const hallTitle = joinBilingualTitle(values.titleRu, values.titleEn)
    if (hallTitle.length < 2) {
      throw new Error(values.lang === 'ru'
        ? 'Название зала обязательно (минимум 2 символа)'
        : 'Hall title is required (min 2 characters)')
    }

    setSubmitting(true)
    try {
      // Upload avatar first if present
      let avatarUrl: string | undefined
      if (values.avatarFile) {
        avatarUrl = await uploadFile(values.avatarFile) ?? undefined
      }

      const res = await fetch(`${apiBaseUrl}/api/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify({
          hallTitle,
          hallDescription: joinBilingual(values.hallDescRu, values.hallDescEn) || undefined,
          artistStatement: joinBilingual(values.statementRu, values.statementEn) || undefined,
          location: values.location?.trim() || undefined,
          websiteUrl: values.websiteUrl?.trim() || undefined,
          avatarUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          throw new Error(values.lang === 'ru'
            ? 'У вас уже есть профиль художника.'
            : 'You already have an artist profile.')
        }
        throw new Error(data.message ?? `HTTP ${res.status}`)
      }

      const artist: CreatedArtist = await res.json()

      // Role was upgraded to ARTIST — refresh token so step 2 has the new role
      await auth.refreshToken()

      return artist
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, error, createProfile, uploadFile, clearError: () => setError(null) }
}
