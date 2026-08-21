import { Link } from '@tanstack/react-router'
import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/lib/use-auth'
import { DashboardLayout } from './DashboardLayout'
import { Button } from '@/components/ui/button'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { apiBaseUrl } from '@/lib/api'
import type { HallCustomization } from '@/components/hall3d/customization'
import {
  FLOOR_PRESETS,
  FRAME_PRESETS,
  LIGHTING_PRESETS,
  ACCENT_PRESETS,
  PEDESTAL_PRESETS,
} from '@/components/hall3d/customization'

// ─── Bilingual labels ───

const WALL_THEMES = [
  { value: 'default', label: 'Светлый / Light', swatch: '#faf8f4' },
  { value: 'dark', label: 'Тёмный / Dark', swatch: '#3a3a36' },
  { value: 'warm', label: 'Тёплый / Warm', swatch: '#f5ede3' },
  { value: 'cool', label: 'Холодный / Cool', swatch: '#eaf0f5' },
  { value: 'custom', label: 'Свой цвет / Custom', swatch: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)' },
]

const FLOOR_LABELS: Record<string, string> = {
  wood: 'Дерево / Wood', marble: 'Мрамор / Marble', concrete: 'Бетон / Concrete',
  darkWood: 'Тёмное дерево / Dark Wood', parquet: 'Паркет / Parquet',
}

const FRAME_LABELS: Record<string, string> = {
  classic: 'Классика / Classic', modern: 'Модерн / Modern', ornate: 'Резной / Ornate',
  minimal: 'Минимум / Minimal', floating: 'Парящий / Floating',
}

const LIGHTING_LABELS: Record<string, string> = {
  warm: 'Тёплый / Warm', cool: 'Холодный / Cool', neutral: 'Нейтральный / Neutral', dramatic: 'Драматичный / Dramatic',
}

const ACCENT_LABELS: Record<string, string> = {
  none: 'Нет / None', blue: 'Синий / Blue', purple: 'Фиолетовый / Purple',
  gold: 'Золотой / Gold', green: 'Зелёный / Green',
}

const PEDESTAL_LABELS: Record<string, string> = {
  marble: 'Мрамор / Marble', wood: 'Дерево / Wood', metal: 'Металл / Metal', concrete: 'Бетон / Concrete',
}

const ROOM_LABELS: Record<string, string> = {
  rectangle: 'Прямоугольник / Rectangle', wide: 'Широкий / Wide', deep: 'Глубокий / Deep', lShape: 'L-форма / L-Shape',
}

const CEILING_LABELS: Record<string, string> = {
  flat: 'Плоский / Flat', coffered: 'Кессонный / Coffered', vaulted: 'Сводчатый / Vaulted',
}

// ─── Default customization ───

const DEFAULT: Required<Omit<HallCustomization, 'wallColor'>> = {
  wallTheme: 'default',
  floorType: 'wood',
  frameStyle: 'classic',
  lightingPreset: 'warm',
  accentLight: 'none',
  pedestalStyle: 'marble',
  roomShape: 'rectangle',
  ceilingStyle: 'flat',
}

// ─── Component ───

interface HallMeta {
  id: string
  artistId: string
  slug: string
  title: string
  isPublished: boolean
}

export function DashboardHallCustomization() {
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hall, setHall] = useState<HallMeta | null>(null)
  const [customization, setCustomization] = useState<Required<Omit<HallCustomization, 'wallColor'>> & { wallColor?: string }>({ ...DEFAULT })

  useEffect(() => {
    if (!auth.accessToken) return
    let cancelled = false
    setLoading(true)

    fetch(`${apiBaseUrl}/api/artists/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'NO_PROFILE' : `HTTP ${r.status}`)
        return r.json()
      })
      .then((artist) => {
        if (cancelled) return
        const h = artist.hall
        if (!h) { setError('NO_HALL'); return }

        setHall({
          id: h.id, artistId: artist.id, slug: h.slug,
          title: h.title, isPublished: h.isPublished,
        })

        // Merge saved customization with defaults
        if (h.customization) {
          setCustomization({ ...DEFAULT, ...h.customization })
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [auth.accessToken])

  const set = <K extends keyof typeof customization>(key: K, value: (typeof customization)[K]) => {
    setCustomization((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!hall) return
    setError(null)
    setSuccess(false)
    setSaving(true)

    // Strip wallColor if theme is not custom
    const payload: Record<string, unknown> = { ...customization }
    if (customization.wallTheme !== 'custom') delete payload.wallColor

    try {
      const res = await fetch(`${apiBaseUrl}/api/halls/${hall.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken!}` },
        body: JSON.stringify({ customization: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render helpers ───

  const Swatch = ({ color, size = 24 }: { color: string; size?: number }) => (
    <span
      style={{
        display: 'inline-block', width: size, height: size, borderRadius: 'var(--radius-sm)',
        background: color, border: '1px solid var(--border)', flexShrink: 0,
      }}
    />
  )

  const SelectorGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{label}</label>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  )

  const OptionBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? 'var(--accent-ink)' : 'var(--text)',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )

  // ─── Loading / error states ───

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-48 bg-[var(--surface)] rounded" />
          <div className="h-10 w-full bg-[var(--surface)] rounded" />
          <div className="h-8 w-64 bg-[var(--surface)] rounded" />
        </div>
      </DashboardLayout>
    )
  }

  if (error === 'NO_PROFILE' || error === 'NO_HALL') {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>
            {error === 'NO_PROFILE'
              ? 'Сначала создайте профиль художника / Create artist profile first.'
              : 'Сначала создайте зал / Create a hall first.'}
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/onboarding/artist">{error === 'NO_PROFILE' ? 'Создать профиль / Create profile' : 'Создать зал / Create hall'}</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  // ─── Main ───

  return (
    <DashboardLayout>
      <RevealOnScroll direction="up">
        <h1 className="text-display-sm mb-2">Кастомизация зала / Hall Customization</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Зал: {hall?.title} · Настройте внешний вид как в игре / Customize your hall like a game skin
        </p>
      </RevealOnScroll>

      <form onSubmit={handleSave} className="space-y-6" style={{ maxWidth: '640px' }}>

        {/* Wall theme */}
        <SelectorGroup label="Цвет стен / Wall Color">
          {WALL_THEMES.map((t) => (
            <OptionBtn key={t.value} active={customization.wallTheme === t.value} onClick={() => set('wallTheme', t.value as typeof customization.wallTheme)}>
              <Swatch color={t.swatch} />
              {t.label}
            </OptionBtn>
          ))}
        </SelectorGroup>

        {/* Custom hex color */}
        {customization.wallTheme === 'custom' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>HEX цвет / HEX Color</label>
            <input
              type="color"
              value={customization.wallColor ?? '#cccccc'}
              onChange={(e) => set('wallColor', e.target.value)}
              style={{ width: 40, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={customization.wallColor ?? ''}
              onChange={(e) => set('wallColor', e.target.value)}
              placeholder="#cccccc"
              maxLength={7}
              className="text-sm px-2 py-1 rounded border w-24"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>
        )}

        {/* Floor type */}
        <SelectorGroup label="Пол / Floor">
          {Object.entries(FLOOR_LABELS).map(([key, label]) => (
            <OptionBtn key={key} active={customization.floorType === key} onClick={() => set('floorType', key as typeof customization.floorType)}>
              <Swatch color={FLOOR_PRESETS[key]?.color ?? '#ccc'} />
              {label}
            </OptionBtn>
          ))}
        </SelectorGroup>

        {/* Frame style */}
        <SelectorGroup label="Стиль рам / Frame Style">
          {Object.entries(FRAME_LABELS).map(([key, label]) => {
            const fp = FRAME_PRESETS[key]
            return (
              <OptionBtn key={key} active={customization.frameStyle === key} onClick={() => set('frameStyle', key as typeof customization.frameStyle)}>
                <Swatch color={key === 'floating' ? 'transparent' : fp?.color ?? '#888'} />
                {label}
              </OptionBtn>
            )
          })}
        </SelectorGroup>

        {/* Lighting preset */}
        <SelectorGroup label="Освещение / Lighting">
          {Object.entries(LIGHTING_LABELS).map(([key, label]) => {
            const lp = LIGHTING_PRESETS[key]
            return (
              <OptionBtn key={key} active={customization.lightingPreset === key} onClick={() => set('lightingPreset', key as typeof customization.lightingPreset)}>
                <Swatch color={lp?.ambientColor ?? '#fff'} />
                {label}
              </OptionBtn>
            )
          })}
        </SelectorGroup>

        {/* Accent light */}
        <SelectorGroup label="Акцентный свет / Accent Light">
          {Object.entries(ACCENT_LABELS).map(([key, label]) => {
            const ap = ACCENT_PRESETS[key]
            return (
              <OptionBtn key={key} active={customization.accentLight === key} onClick={() => set('accentLight', key as typeof customization.accentLight)}>
                <span style={{
                  display: 'inline-block', width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: key === 'none' ? 'transparent' : ap?.color,
                  border: key === 'none' ? '1px dashed var(--border)' : 'none',
                  boxShadow: key !== 'none' ? `0 0 8px ${ap?.color}` : 'none',
                  flexShrink: 0,
                }} />
                {label}
              </OptionBtn>
            )
          })}
        </SelectorGroup>

        {/* Pedestal style */}
        <SelectorGroup label="Постаменты / Pedestals">
          {Object.entries(PEDESTAL_LABELS).map(([key, label]) => (
            <OptionBtn key={key} active={customization.pedestalStyle === key} onClick={() => set('pedestalStyle', key as typeof customization.pedestalStyle)}>
              <Swatch color={PEDESTAL_PRESETS[key]?.color ?? '#ccc'} />
              {label}
            </OptionBtn>
          ))}
        </SelectorGroup>

        {/* Room shape */}
        <SelectorGroup label="Форма комнаты / Room Shape">
          {Object.entries(ROOM_LABELS).map(([key, label]) => (
            <OptionBtn key={key} active={customization.roomShape === key} onClick={() => set('roomShape', key as typeof customization.roomShape)}>
              {label}
            </OptionBtn>
          ))}
        </SelectorGroup>

        {/* Ceiling style */}
        <SelectorGroup label="Потолок / Ceiling">
          {Object.entries(CEILING_LABELS).map(([key, label]) => (
            <OptionBtn key={key} active={customization.ceilingStyle === key} onClick={() => set('ceilingStyle', key as typeof customization.ceilingStyle)}>
              {label}
            </OptionBtn>
          ))}
        </SelectorGroup>

        {/* Status messages */}
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            Сохранено / Saved — обновите страницу 3D зала чтобы увидеть изменения
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение... / Saving...' : 'Сохранить / Save'}
        </Button>
      </form>
    </DashboardLayout>
  )
}
