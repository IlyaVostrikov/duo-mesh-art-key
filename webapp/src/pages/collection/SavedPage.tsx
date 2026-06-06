import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { Link } from '@tanstack/react-router'

export function SavedPage() {
  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <h1 className="text-display-hero" style={{ marginBottom: '24px' }}>
          Сохранённое / Saved
        </h1>
      </RevealOnScroll>

      <RevealOnScroll direction="up" delay={80}>
        <div
          style={{
            maxWidth: '600px',
            padding: '48px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          {/* Empty state icon */}
          <div
            style={{
              width: '64px', height: '64px', margin: '0 auto 20px', borderRadius: '50%',
              backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
            Пока ничего нет / Nothing here yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Сохраняйте понравившиеся работы из галереи — они появятся здесь.
            <br />
            Save artworks you like from the gallery — they will appear here.
          </p>
          <Link
            to="/gallery"
            style={{
              display: 'inline-block', padding: '10px 24px',
              backgroundColor: 'var(--accent)', color: 'var(--accent-ink)',
              borderRadius: 'var(--radius)', textDecoration: 'none',
              fontSize: '0.875rem', fontWeight: 600,
            }}
          >
            В галерею / To Gallery
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  )
}
