# T15 — Дедупликация Create/Edit форм + hook оркестрации загрузки

- **Приоритет:** 6/10
- **Стадия:** Stage 2
- **Область:** webapp
- **Статус:** backlog

## Что не так

- `CreateArtworkForm.tsx` (416 строк) и `EditArtworkForm.tsx` (338 строк) ~90% дубль: одна вёрстка, один `CATEGORIES` (Create L11 / Edit L12), одинаковые блоки poster/model upload, одинаковые status/price/currency селекты.
- Оркестрация загрузки (presign → XHR upload → finalize → спец-кейс «Failed to fetch» → прогресс) продублирована в 4+ местах: `CreateArtworkForm`, `EditArtworkForm`, `ArtistOnboarding` Step 2, `use-artist-onboarding.ts`, `DashboardMedia`.

## Почему это важно

Каждое изменение стиля/лейбла делается дважды; билингвальный баг (T03) живёт ровно в одной из копий. `DashboardMedia` использует `uploadFile`, формы — `uploadFiles`, поэтому хеши/финализация различаются. Дубликат — источник дрейфа.

## Локализация

- `webapp/src/components/artwork/CreateArtworkForm.tsx`, `EditArtworkForm.tsx`.
- `webapp/src/components/artwork/ArtistOnboarding.tsx` Step 2.
- `webapp/src/hooks/use-artist-onboarding.ts`.
- `webapp/src/lib/upload.ts` — транспорт (уже централизован).

## Минимальная правка

1. Вынести общий JSX полей/upload в `ArtworkFields` под-компонент; Create/Edit — тонкие обёртки (отличие: начальные значения + глагол submit POST vs PATCH).
2. Вынести `useArtworkUpload` hook (`{ upload, uploadModel, progress, error }`), переиспользовать в 4 местах; транспорт оставить в `lib/upload.ts`.

## Подводные камни

- **Не трогать T03 отдельно** — дедуп и билингвальный фикс пересекаются в `EditArtworkForm`; исполнять после T03 либо аккуратно совместить.
- **`uploadFile` vs `uploadFiles`** расходятся — при сведении выбрать один путь и убедиться, что хеш/финализация совпадают.
- **Прогресс-стейт** (XHR onprogress) должен сохраниться в hook — не потерять UX.
- **`CATEGORIES`/статус-константы** дублируются и в `AdminArtworks`/`ArtistOnboarding` — вынести в `lib/labels.ts` (см. T16).

## Приёмочные критерии

1. `ArtworkFields` переиспользуется, Create/Edit — тонкие обёртки.
2. `useArtworkUpload` заменяет 4+ дубля оркестрации.
3. `bun run --cwd webapp build` + `bun run --cwd webapp test` зелёные.

## Валидация

```bash
bun run --cwd webapp build
bun run --cwd webapp test
# ручная проверка create/edit/upload на прод-подобном окружении
```

## Связанные задачи

- T03 (билингвальный фикс)
- T14 (Query)
- T22 (god-components)
