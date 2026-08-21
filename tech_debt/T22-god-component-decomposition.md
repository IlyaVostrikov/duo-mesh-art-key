# T22 — Декомпозиция god-components

- **Приоритет:** 5/10
- **Стадия:** Stage 2
- **Область:** webapp
- **Статус:** backlog

## Что не так

Крупнейшие компоненты приложения смешивают data-fetch + state + форму + презентацию в одном файле:

- `HeroModel3D.tsx` (661 строк) — крупнейший; сцена 3D + poster/fullscreen fallback UI + resize/intersection + fetch.
- `ArtworkDetailPage.tsx` (522), `ArtistOnboarding.tsx` (473), `HowItWorks.tsx` (458), `PurchaseCeremony.tsx` (431), `DashboardHallCustomization.tsx` (368), `CertificatePage.tsx` (355), `DashboardHallLayout.tsx` (346), `VerifyResultPage.tsx` (340).

## Почему это важно

Высокая когнитивная нагрузка, трудно юнит-тестировать, первоочередные места дублирующихся багов (сырые фетчи, inline-парсинг). Любое изменение 3D рискует задеть fallback UI.

## Локализация

- `webapp/src/components/artwork/HeroModel3D.tsx` и перечисленные страницы.

## Минимальная правка

Выносить **по одной заботе за раз**, без рерайтов. По мере приземления общих хелперов (T14 `useArtistProfile`, T15 `useArtworkUpload`, T21 `formatPrice`/диалог) вычищать по одному:
- `HeroModel3D`: вынести fullscreen/fallback UI в под-компонент, сцену оставить.
- Остальные: вынести fetch-хуки и общие блоки по мере появления.

## Подводные камни

- **Это не самостоятельный «рерайт»** — только по одной заботе, строго после T14/T15/T21 (иначе дублирующая работа).
- **Не трогать 3D-сцену** в `HeroModel3D` — только UI-обёртку.
- **Проверять поведение** (loading/error/empty) при каждом выносе — не потерять состояния.
- Избегать преждевременной абстракции: выносить только то, что реально переиспользуется (см. T15).

## Приёмочные критерии

1. `HeroModel3D` разделён (сцена vs fallback UI).
2. Вынесенные хуки/компоненты переиспользуются, поведение идентично.
3. `bun run --cwd webapp build` + `bun run --cwd webapp test` зелёные.

## Валидация

```bash
bun run --cwd webapp build
bun run --cwd webapp test
```

## Связанные задачи

- T14, T15, T21 (доноры хелперов)
