import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { apiBaseUrl } from '@/lib/api'

const CATEGORIES = ['DIGITAL', 'PAINTING', 'SCULPTURE', 'PHOTOGRAPHY', 'DRAWING', 'MIXED_MEDIA', 'PRINT', 'NFT', 'OTHER']
const STATUSES = ['DRAFT', 'LISTED', 'IN_EXHIBITION', 'SOLD', 'RESERVED', 'ARCHIVED'] as const

interface Props {
  artworkId: string
  onSaved: () => void
  onCancel: () => void
}

export function EditArtworkForm({ artworkId, onSaved, onCancel }: Props) {
  const auth = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('DIGITAL')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [status, setStatus] = useState('DRAFT')

  // Load artwork
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${apiBaseUrl}/api/artworks/${artworkId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        // Parse bilingual title: "RU / EN" → extract RU part
        const sep = data.title.indexOf(' / ')
        setTitle(sep > 0 ? data.title.slice(0, sep) : data.title)
        setDescription(data.description ?? '')
        setCategory(data.category ?? 'DIGITAL')
        setPrice(data.price ?? '')
        setCurrency(data.currency ?? 'RUB')
        setStatus(data.status ?? 'DRAFT')
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [artworkId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Название обязательно / Title is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/artworks/${artworkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken!}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          price: price ? Number(price) : undefined,
          currency,
          status,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? `HTTP ${res.status}`)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 mb-8 flex items-center justify-center gap-2"
        style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <Spinner />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Загрузка... / Loading...</span>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 mb-8 space-y-5"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
        Редактировать работу / Edit Artwork
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Название (RU) <span style={{ color: 'var(--accent)' }}>*</span>
        </label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название работы" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Описание / Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Описание работы..." />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Категория</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-4xl border"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Цена</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="15000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Валюта</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-4xl border"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Статус / Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full h-9 px-3 text-sm rounded-4xl border"
          style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', borderColor: 'var(--border)' }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение... / Saving...' : 'Сохранить / Save'}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" disabled={saving}>
          Отмена / Cancel
        </Button>
      </div>
    </form>
  )
}
