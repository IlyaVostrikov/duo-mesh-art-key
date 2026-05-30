# Design V2 — Современная арт-галерея

Клон дизайна для согласования. Оригинальные файлы не тронуты.

## Что изменено

- Убраны анимации `float` / `breathe` / `shimmer` / `ParticleField` — статика создаёт больше достоинства
- Убран двуязычный inline-текст ("RU / EN") из всего UI — язык по умолчанию русский
- Типографика: Cormorant в героях (сейчас почти не используется), Inter в UI
- ArtworkCard: убран `mixBlendMode: lighten` hover — чистая рамка вместо засвета
- Gallery: нативный `<select>` заменён на таб-кнопки, чистый grid
- Nav: ничего лишнего — только логотип, разделы, аватар
- Акцент `#C6FF3A` — только в интерактивных состояниях (focus, active, CTA), не декоративный

## Как применить после согласования

Для каждого файла `X.v2.tsx` скопировать содержимое в оригинальный `X.tsx`.
Для `index.v2.css` — заменить блоки keyframes и radius-токены в `index.css`.

## Файлы

| V2 файл | Заменяет |
|---------|----------|
| `index.v2.css` | `src/index.css` (только изменённые блоки) |
| `pages.v2.tsx` | `src/pages.tsx` |
| `LandingHero.v2.tsx` | `src/pages/landing/LandingHero.tsx` |
| `LandingValueProp.v2.tsx` | `src/pages/landing/LandingValueProp.tsx` |
| `LandingFooterCTA.v2.tsx` | `src/pages/landing/LandingFooterCTA.tsx` |
| `GalleryPage.v2.tsx` | `src/pages/gallery/GalleryPage.tsx` |
| `ArtworkCard.v2.tsx` | `src/components/artwork/ArtworkCard.tsx` |
