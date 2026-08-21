# T18 — Декомпозиция god-модуля `app.ts`

- **Приоритет:** 5/10
- **Стадия:** Stage 2
- **Область:** backend
- **Статус:** backlog

## Что не так

`backend/src/app.ts` (279 строк): 21 монтаж роутов, 17 сервисов, инжектируемых в контекст через один `app.use('*')` middleware, CORS/secureHeaders, монтаж rate-limit, и inline `/uploads` static-хендлер со своей mime-картой + S3-redirect fallback. Рукописный тип `AppBindings` (L62-83) дублирует конструкцию сервисов и может разойтись с тем, что ожидают роуты.

## Почему это важно

Graphify подтверждает `app.ts` как top in-degree узел (degree=90). Каждая новая зависимость протягивается через одну точку сборки; type-drift; шумные диффы; медленное, склонное к ошибкам расширение.

## Локализация

- `backend/src/app.ts` (L62-83 AppBindings, inline `/uploads` хендлер, `*` middleware).

## Минимальная правка

1. Вынести `/uploads` static-обслуживание (mime-карта + S3 fallback) в `backend/src/routes/uploads-static.ts`.
2. Выводить `AppBindings` из единого `Services`-интерфейса (не рукописно).
3. Дать root-роутам собственные префиксы (`/kdf-migration`, `/transfers`, `/purchase`) вместо `/`.

## Подводные камни

- **`app.ts` — точка сборки всех роутов**, degree=90. По CLAUDE.md перед правкой обязательно `python -m graphify explain "app.ts"`. Не менять структуру без замера blast radius.
- **Не переделывать всё сразу** — выносить по одной заботе (uploads-static первым), проверять после каждого шага.
- **`AppBindings` → `Services`** может затронуть все роуты, читающие контекст — проверить типизацию по всему `backend/src/routes`.
- **Не менять поведение** — только перестановка/декомпозиция, без изменения маршрутов.

## Приёмочные критерии

1. `/uploads` вынесен в отдельный роут, поведение идентично.
2. `AppBindings` выведен из `Services`.
3. `bun run --cwd backend typecheck` + `bun run --cwd backend test:unit` + сборка бандла зелёные.

## Валидация

```bash
python -m graphify explain "app.ts"
bun run --cwd backend typecheck
bun run --cwd backend test:unit
bun run --cwd backend scripts/build-vercel.mjs
```

## Связанные задачи

- T06 (портабельность)
- T19 (dead-code)
