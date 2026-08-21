# T21 — Обход дизайн-системы + UX (цвета, цены, диалоги)

- **Приоритет:** 5/10
- **Стадия:** Stage 2
- **Область:** webapp · website
- **Статус:** backlog

## Что не так

1. **Зашитые hex-цвета** в ~9 файлах: `AdminDashboard.tsx` (40-43), `VerifyResultPage.tsx` (259-260), `TrustModel.tsx`, `HowItWorks.tsx`, `CertificatePage.tsx`, `ArtworkDetailPage.tsx` (`#e74c3c`), `artworks/[id].astro` (`#c44`), `verify.astro`. Токены (`--accent`, `--success`, `--surface`) существуют, но игнорируются.
2. **Inline-форматирование цен** (~10 мест) с зашитым символом валюты, игнорирует `currency` арт-объекта: `DashboardSales.tsx:114` (`₽`), `ArtworkDetailPage` (257-258, 330-331, 358-359, 500), `VerifyResultPage:305`, `AdminArtworks:232`, `artworks.astro`.
3. **Нативные `prompt`/`confirm`/`alert`** для деструктивных действий: `DashboardArtworks.tsx:72,84`, `AdminArtworks.tsx:88,99`. Delete-гейт RU-only («удалить») блокирует EN-пользователей.

## Почему это важно

Тёмная тема/теминг ломается; сайт выглядит по-разному от страницы к странице. Неверное отображение дохода (валюта) — худший вид UI-бага для художника. Нативные диалоги нетестируемы, нестилизуемы, блокируют main thread; RU-only слово — функциональный баг для EN.

## Локализация

- `webapp/src/lib/utils.ts` — уже есть `formatPrice` (используется лишь в 3 местах).
- `webapp/src/components/ui/` — существующие токены/примитивы.
- 9+ файлов с hex-цветами, ~10 мест цен.

## Минимальная правка

1. Заменить hex на CSS-переменные (`var(--success)`, `var(--danger)`, `var(--accent)`) или добавить недостающие токены.
2. Вести всё ценовое рендеринг через `formatPrice(price, currency)`; убрать inline-копии.
3. Заменить `prompt`/`confirm`/`alert` на общий confirm-диалог; текст подтверждения — language-aware.

## Подводные камни

- **`formatPrice` уже есть** — не писать новый, а использовать существующий.
- **Подтверждение удаления уже реализовано 3 разными способами** (в т.ч. hand-rolled модал в `ArtworkDetailPage`) — свести к одному общему компоненту.
- **Не менять визуальный язык** — только перевести на токены, не редизайн.
- **Язык подтверждения**: не зашивать RU — либо i18n, либо click-to-confirm.

## Приёмочные критерии

1. Hex-цвета success/error/brand заменены на токены в затронутых файлах.
2. Цены рендерятся через `formatPrice`, валюта учитывается.
3. Удаление/архив через общий диалог, не нативный `prompt`/`confirm`.
4. `bun run --cwd webapp build` + `bun run --cwd website build` зелёные.

## Валидация

```bash
bun run --cwd webapp build
bun run --cwd website build
```

## Связанные задачи

- T14 (SaveButton/FollowButton)
- T22 (god-components)
