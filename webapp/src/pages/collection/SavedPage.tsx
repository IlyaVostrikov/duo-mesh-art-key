import { RevealOnScroll } from '@/components/motion/RevealOnScroll'

export function SavedPage() {
  return (
    <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '64px 20px' }}>
      <RevealOnScroll direction="up">
        <h1 className="text-display-hero" style={{ marginBottom: '16px' }}>
          Сохранённое / Saved
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={80}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', lineHeight: 1.6 }}>
          Избранные работы, сохранённые для просмотра. Добавляйте работы в избранное из галереи.
          <br />
          Favorite artworks saved for later. Add works to favorites from the gallery.
        </p>
      </RevealOnScroll>
    </section>
  )
}
