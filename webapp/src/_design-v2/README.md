# Design V2 — Современная арт-галерея + Большой Гротеск

Клон дизайна для согласования. Оригинальные файлы не тронуты.

## Что изменено

### Шрифт
- **Figtree Variable** — главный дисплейный гротеск (уже установлен, не использовался)
  - Заголовки, карточки, навигация, dashboard → Figtree
  - Большой, тугой кернинг (-0.03-0.04em), weight 700-800
- **Unbounded Variable** — только бренд-марка "DUO MESH" (логотип, badge)
- **Cormorant Variable** — editorial-подписи под работами, цитаты
- **Inter Variable** — body-текст, описания, UI-мелочь

### Эффекты (возвращены, но дисциплинированы)
| Эффект | Было | Стало |
|--------|------|-------|
| `float` | на текстовом блоке hero | только на **изображении** — текст неподвижен |
| `shimmer` | на badge hero | сохранён на badge hero |
| `glow-pulse` | `breathe` везде | только на **рамке изображения** в hero |
| `ParticleField` | 35 частиц, dist 90 | **22 частицы, dist 120** — реже, воздушнее |
| cursor spotlight | был | сохранён, чуть слабее (0.035 opacity) |
| `mixBlendMode: lighten` на картинках | был | **убран** — давал белесый засвет |
| hover glow на ArtworkCard | box-shadow + blend | только **accent border** (1px) + лёгкий glow |

### Остальное
- Только русский язык в основном UI (без "/ English" дублирования)
- Навигация: clean accent-underline для active-состояния
- Dashboard hub: grid-таблица вместо карточек
- Галерея: tab-кнопки вместо `<select>` для сортировки
- Fade-in на изображениях: исправлен (начальный opacity: 0 был пропущен)

## Как применить после согласования

### 1. Добавить импорт шрифта в `src/index.css` (строка 4-6):
```css
@import "@fontsource-variable/figtree";  /* ← добавить */
```

### 2. Заменить CSS-блоки в `src/index.css`:
Скопировать из `index.v2.css` блоки `@theme inline`, keyframes и type scale утилиты.

### 3. Компоненты — скопировать содержимое:

| V2 файл | Заменяет |
|---------|----------|
| `LandingHero.v2.tsx` | `src/pages/landing/LandingHero.tsx` |
| `LandingValueProp.v2.tsx` | `src/pages/landing/LandingValueProp.tsx` |
| `LandingFooterCTA.v2.tsx` | `src/pages/landing/LandingFooterCTA.tsx` |
| `GalleryPage.v2.tsx` | `src/pages/gallery/GalleryPage.tsx` |
| `ArtworkCard.v2.tsx` | `src/components/artwork/ArtworkCard.tsx` |
| `pages.v2.tsx` | `src/pages.tsx` |

### 4. Одновременно исправить критичный баг в оригинале:
В `src/components/AccountMenu.tsx` — перенести оба `useEffect` **выше** строки `if (!user) return null`.
