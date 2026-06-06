import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { apiBaseUrl } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { DashboardLayout } from './DashboardLayout'

interface ArtistKeys {
  id: string
  displayName: string
  signingKeys: Array<{
    id: string
    publicKey: string
    keyAlias: string | null
    isActive: boolean
    createdAt: string
    revokedAt: string | null
  }>
}

export function DashboardKeys() {
  const auth = useAuth()
  const [data, setData] = useState<ArtistKeys | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth.accessToken) return
    let cancelled = false

    fetch(`${apiBaseUrl}/api/artists/me`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const artist = await r.json()
        if (cancelled) return

        const keysResp = await fetch(`${apiBaseUrl}/api/public-keys/artist/${artist.id}`)
        if (keysResp.ok) {
          const keys = await keysResp.json()
          if (!cancelled) setData({ ...artist, signingKeys: keys.keys ?? [] })
        } else {
          if (!cancelled) setData({ ...artist, signingKeys: [] })
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [auth.accessToken])

  return (
    <DashboardLayout>
      <section className="mx-auto w-full max-w-2xl px-5 py-8">
        <RevealOnScroll direction="up">
          <h1 className="font-display text-2xl mb-1">Ключи подписи / Signing Keys</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Ed25519 ключи, используемые для криптографической подписи provenance-записей ваших работ.
          </p>
        </RevealOnScroll>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-muted-foreground p-4">Ошибка: {error}</p>
        ) : (!data || data.signingKeys.length === 0) ? (
          <RevealOnScroll direction="up" delay={60}>
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Ключи ещё не созданы. Они генерируются автоматически при регистрации художника.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Keys not yet created. They are generated automatically at artist registration.
                </p>
              </CardContent>
            </Card>
          </RevealOnScroll>
        ) : (
          data.signingKeys.map((key, idx) => (
            <RevealOnScroll key={key.id} direction="up" delay={60 + idx * 40}>
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {key.keyAlias || `Key #${idx + 1}`}
                      </CardTitle>
                      <CardDescription>
                        {key.isActive ? (
                          <span style={{ color: 'var(--accent)' }}>● Активен / Active</span>
                        ) : key.revokedAt ? (
                          <span style={{ color: 'var(--text-muted)' }}>● Отозван / Revoked {new Date(key.revokedAt).toLocaleDateString('ru-RU')}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>● Не активен / Inactive</span>
                        )}
                      </CardDescription>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(key.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
                      Публичный ключ / Public Key
                    </span>
                    <code className="font-mono text-xs break-all" style={{ color: 'var(--accent)' }}>
                      {key.publicKey}
                    </code>
                  </div>
                  <p className="text-muted-foreground text-xs mt-3">
                    Ed25519 (RFC 8032) · 32 bytes raw public key · hex-encoded
                  </p>
                </CardContent>
              </Card>
            </RevealOnScroll>
          ))
        )}

        <RevealOnScroll direction="up" delay={200}>
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-sm">
                <strong>Модель хранения / Storage model:</strong>{' '}
                Приватные ключи хранятся на сервере в зашифрованном виде (AES-256-GCM).
                Платформа обязуется не использовать ключ без вашего ведома.
                Подпись всегда инициируется через ваши действия на платформе.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Private keys are stored server-side, encrypted (AES-256-GCM).
                The platform commits to never use your key without your knowledge.
                Signing is always initiated through your actions on the platform.
              </p>
              <p className="text-muted-foreground text-xs mt-2 italic">
                Roadmap: некастодиальная модель — ключи генерируются и хранятся в вашем браузере,
                сервер хранит только публичный ключ.
              </p>
            </CardContent>
          </Card>
        </RevealOnScroll>
      </section>
    </DashboardLayout>
  )
}
