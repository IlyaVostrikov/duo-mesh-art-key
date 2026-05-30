import { Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Обзор / Overview', exact: true },
  { to: '/dashboard/artworks', label: 'Работы / Artworks' },
  { to: '/dashboard/hall', label: 'Зал / Hall' },
  { to: '/dashboard/settings', label: 'Профиль / Settings' },
  { to: '/dashboard/sales', label: 'Продажи / Sales' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const loc = useLocation()

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return loc.pathname === path
    return loc.pathname.startsWith(path)
  }

  if (!auth.user) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-12 text-center">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Войдите в аккаунт / Log in</h2>
        <p style={{ color: 'var(--text-muted)' }}>Доступ к дашборду только для художников.</p>
      </section>
    )
  }

  return (
    <div className="flex" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        className="flex-shrink-0"
        style={{
          width: '220px',
          paddingTop: '48px',
          paddingRight: '32px',
          borderRight: '1px solid var(--border)',
        }}
      >
        <Link to="/" className="block mb-8 text-sm" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Галерея / Gallery
        </Link>
        <ul className="space-y-1" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to as any}
                className="block px-3 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius)',
                  color: isActive(item.to, item.exact) ? 'var(--text)' : 'var(--text-muted)',
                  backgroundColor: isActive(item.to, item.exact) ? 'var(--surface)' : 'transparent',
                  textDecoration: 'none',
                  transition: `background-color var(--dur-fast) var(--ease)`,
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <main className="flex-1" style={{ paddingTop: '48px', paddingLeft: '48px', paddingBottom: '96px' }}>
        {children}
      </main>
    </div>
  )
}
