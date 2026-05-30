import { useState, useEffect } from 'react'
import { LandingHero } from './LandingHero'
import { LandingValueProp } from './LandingValueProp'
import { LandingFeaturedWorks } from './LandingFeaturedWorks'
import { LandingFeaturedArtists } from './LandingFeaturedArtists'
import { LandingFeaturedHalls } from './LandingFeaturedHalls'
import { LandingFooterCTA } from './LandingFooterCTA'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

const API_BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:3000'

interface FeaturedResponse {
  hero: any
  works: any[]
  artists: any[]
  halls: any[]
}

export function LandingPage() {
  const [data, setData] = useState<FeaturedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<'ru' | 'en'>('ru')

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/featured`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-24 px-5 py-16">
        <Skeleton className="h-[70vh] w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-24 text-center">
        <Typography variant="h2">Something went wrong / Что-то пошло не так</Typography>
        <Typography tone="muted">{error ?? 'No data'}</Typography>
        <Button onClick={() => window.location.reload()}>Try again / Попробовать снова</Button>
      </section>
    )
  }

  return (
    <>
      <LandingHero heroWork={data.hero} lang={lang} />
      <LandingValueProp lang={lang} />
      <LandingFeaturedWorks works={data.works} lang={lang} />
      <LandingFeaturedArtists artists={data.artists} lang={lang} />
      <LandingFeaturedHalls halls={data.halls} lang={lang} />
      <LandingFooterCTA lang={lang} onToggleLang={() => setLang((l) => (l === 'ru' ? 'en' : 'ru'))} />
    </>
  )
}
