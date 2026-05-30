import { Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { Spinner } from '@/components/ui/spinner'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

const NAV = [
  { to: '/admin', label: 'Обзор / Overview', exact: true },
  { to: '/admin/users', label: 'Пользователи / Users' },
  { to: '/admin/artworks', label: 'Работы / Artworks' },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const loc = useLocation()

  if (auth.isBootstrapping) {
    return (
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
        <Spinner />
      </section>
    )
  }

  if (!auth.user || auth.user.role !== 'ADMIN') {
    return (
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Доступ запрещён / Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>Требуется роль администратора / Admin role required.</p>
      </section>
    )
  }

  const isActive = (path: string, exact?: boolean) =>
    exact ? loc.pathname === path : loc.pathname.startsWith(path)

  return (
    <div style={{ display: 'flex', maxWidth: '1280px', margin: '0 auto', padding: '0 20px', minHeight: '100vh' }}>
      <nav style={{
        width: '220px', flexShrink: 0, paddingTop: '48px', paddingRight: '32px',
        borderRight: '1px solid var(--border)',
      }}>
        <Link to="/" style={{ display: 'block', marginBottom: '24px', fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← DUO MESH
        </Link>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Admin
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius)',
                  color: isActive(item.to, item.exact) ? 'var(--text)' : 'var(--text-muted)',
                  backgroundColor: isActive(item.to, item.exact) ? 'var(--surface)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: '2px',
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, paddingTop: '48px', paddingLeft: '48px', paddingBottom: '96px' }}>
        <RevealOnScroll direction="up">
          {children}
        </RevealOnScroll>
      </main>
    </div>
  )
}
