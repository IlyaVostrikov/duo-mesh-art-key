# T14 — Внедрение TanStack Query + консолидация fetch-wrapper

- **Приоритет:** 6/10
- **Стадия:** Stage 2
- **Область:** webapp
- **Статус:** backlog

## Что не так

TanStack Query установлен, но используется только в `webapp/src/lib/auth.tsx`. Остальное — сырой `fetch` + `useState`:

- 5+ компонентов фетчат `/api/artists/me` в свой `useState`: `DashboardHome`, `DashboardHallSettings`, `DashboardHallCustomization`, `AccountMenu`, `DashboardProfileSettings`, `DashboardHallLayout`.
- Три разных паттерна fetch: `CollectionPage` сырой fetch, `SavedPage` через `auth.api.listSaved()`, `FollowingPage` через `auth.api.requestJson('/api/follows')`, `FollowButton` сырой fetch, `SaveButton` через ApiClient.
- После мутации ничего не инвалидирует связанные запросы (их просто нет) — экраны полагаются на refetch-on-mount.

## Почему это важно

Устаревшие данные после правок; нет retry/dedup/кеша; `isLoading/isError` перереализуются в каждом компоненте; 401 после истечения токена ведёт себя по-разному на разных страницах.

## Локализация

- `webapp/src/lib/auth.tsx` — единственный правильный Query-пользователь.
- `webapp/src/lib/api.ts` — готовый ApiClient (refresh/retry).
- 6 компонентов выше — сырые фетчи `/api/artists/me`.

## Минимальная правка

1. Добавить `useArtistProfile()` (`useQuery`, ключ `['artist','me']`), инвалидировать после PATCH/save.
2. Перевести топ-фетчи (artist profile, sales list, follows) на `useQuery`, остальное оставить.
3. Свести fetch к `auth.api` (убить сырые `fetch(apiBaseUrl + '/api/...')` в страницах).

## Подводные камни

- **Не мигрировать всё сразу** — только топ-фетчи; остальное оставить. Это прямое требование «без оверинжиниринга».
- **Ключи инвалидации** должны совпадать с мутациями (create artwork → invalidate `['artworks']`, edit profile → invalidate `['artist','me']`).
- **`auth.api` уже имеет refresh/retry** — не дублировать его в новом слое.
- **`SaveButton` vs `FollowButton`** (см. T15/T21) — свести к общему паттерну, но не в этой задаче.

## Приёмочные критерии

1. `useArtistProfile()` используется вместо 6 дублей.
2. PATCH профиля инвалидирует кеш artist.
3. `bun run --cwd webapp build` + `bun run --cwd webapp test` зелёные.

## Валидация

```bash
bun run --cwd webapp build
bun run --cwd webapp test
```

## Связанные задачи

- T15 (формы/upload)
- T21 (SaveButton/FollowButton)
