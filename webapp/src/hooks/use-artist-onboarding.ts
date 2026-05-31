import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { apiBaseUrl } from '@/lib/api'
import { joinBilingual, joinBilingualTitle } from '@/lib/utils'

export interface ArtistOnboardingValues {
  titleRu: string
  titleEn: string
  statementRu: string
  statementEn: string
  hallDescRu: string
  hallDescEn: string
  location: string
  websiteUrl: string
  lang: 'ru' | 'en'
}

export function useArtistOnboarding() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(values: ArtistOnboardingValues) {
    setError(null)

    const hallTitle = joinBilingualTitle(values.titleRu, values.titleEn)
    if (hallTitle.length < 2) {
      setError(values.lang === 'ru'
        ? 'Название зала обязательно (минимум 2 символа)'
        : 'Hall title is required (min 2 characters)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({
          hallTitle,
          hallDescription: joinBilingual(values.hallDescRu, values.hallDescEn) || undefined,
          artistStatement: joinBilingual(values.statementRu, values.statementEn) || undefined,
          location: values.location.trim() || undefined,
          websiteUrl: values.websiteUrl.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setError(values.lang === 'ru'
            ? 'У вас уже есть профиль художника.'
            : 'You already have an artist profile.')
          return
        }
        setError(data.message ?? `HTTP ${res.status}`)
        return
      }

      const artist = await res.json()
      navigate({ to: '/hall/$hallSlug', params: { hallSlug: artist.hall.slug } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, error, submit, clearError: () => setError(null) }
}
