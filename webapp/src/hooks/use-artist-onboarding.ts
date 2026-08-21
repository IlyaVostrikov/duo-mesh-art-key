import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { apiBaseUrl } from '@/lib/api'
import { uploadFile, uploadModelFile, type UploadProgressCallback } from '@/lib/upload'
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
      // Create the profile first (no avatar). This upgrades the user's role
      // GUEST → ARTIST, which is required before any upload can be authorized.
      const res = await fetch(`${apiBaseUrl}/api/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify({
          hallTitle,
          hallDescription: joinBilingual(values.hallDescRu, values.hallDescEn) || undefined,
          artistStatement: joinBilingual(values.statementRu, values.statementEn) || undefined,
          location: values.location?.trim() || undefined,
          websiteUrl: values.websiteUrl?.trim() || undefined,
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

      // Avatar is now authorized (role is ARTIST). Attach it, but don't fail
      // onboarding if the storage upload fails — the profile is already created
      // and the avatar can be re-added later.
      if (values.avatarFile) {
        try {
          const result = await uploadFile(values.avatarFile, auth.accessToken!)
          await fetch(`${apiBaseUrl}/api/artists/${artist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
            body: JSON.stringify({ avatarUrl: result.url }),
          })
        } catch (err) {
          console.warn('Avatar upload failed during onboarding; profile created without it', err)
        }
      }

      // Refresh the session now that the role is upgraded. Non-fatal: the
      // profile is already created and every request re-reads the role from
      // the DB, so a failed refresh must not fail onboarding.
      try {
        await auth.refreshToken()
      } catch (err) {
        console.warn('Session refresh after onboarding failed', err)
      }

      return artist
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать профиль / Profile creation failed')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function upload(file: File, onProgress?: UploadProgressCallback): Promise<string | null> {
    const result = await uploadFile(file, auth.accessToken!, onProgress)
    return result.url ?? null
  }

  async function uploadModel(file: File, onProgress?: UploadProgressCallback): Promise<string | null> {
    const result = await uploadModelFile(file, auth.accessToken!, onProgress)
    return result.url ?? null
  }

  return { submitting, error, createProfile, uploadFile: upload, uploadModelFile: uploadModel, clearError: () => setError(null) }
}
