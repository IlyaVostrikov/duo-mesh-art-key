# T11 — Восстановление mobile-приложения + расхождение имён пакетов

- **Приоритет:** 9/10 (структурно)
- **Стадия:** Stage 2 — **продуктовое решение**
- **Область:** mobile · docs
- **Статус:** backlog

## Что не так

- `mobile/` содержит только `README.md`. Приложение удалено из ветки `master` коммитом `3841603 "Clean master mobile placeholder"`.
- Ветки `mobile` нет ни в локальных refs, ни на remote (`git ls-remote --heads origin` — только `deploy/*`, `fix/*`, `master`).
- `docs/TESTING.md:98-100` и `docs/DEPLOYMENT.md:316-318` описывают `bun run --cwd mobile e2e:maestro:audit` и переключение на ветку `mobile`, которой не существует.
- Подтверждённый дрейф имён: удалённый `mobile` зависел от `@web-app-demo/contracts`, текущий мастер — `@duo-mesh/contracts` (ренейм после удаления mobile). Восстановление «в лоб» не соберётся.

## Почему это важно

Структурная целостность: история mobile удалена из дефолтной ветки, поэтому изменения общих пакетов (`@duo-mesh/contracts`, `@duo-mesh/verifier`) гарантированно расходятся с тем, что использует воскрешённый mobile-форк. Доки вводят в заблуждение (ссылаются на несуществующую ветку).

## Локализация

- `mobile/README.md` — инструкция `git switch mobile`.
- `docs/TESTING.md:98-100`, `docs/DEPLOYMENT.md:316-318` — ссылки на mobile-ветку.
- `packages/contracts/package.json` — `@duo-mesh/contracts` (было `@web-app-demo/contracts`).
- Последний снапшот mobile: `git show 3841603^:mobile/`.

## Минимальная правка

**Требует решения пользователя — выбрать один из путей:**
1. **Восстановить** mobile как реальный workspace на `master` (из `git show 3841603^`), переименовать импорты `@web-app-demo/contracts` → `@duo-mesh/contracts`, решить вопрос зависимости от `@duo-mesh/verifier` (сейчас её нет).
2. **Заархивировать**: удалить `mobile/` + обновить/удалить вводящие в заблуждение доки, чтобы «фикция ветки» перестала быть load-bearing.

## Подводные камни

- **Дрейф не только имён:** mobile несёт template-брендинг (`APP_ID com.webappdemo.mobile`, scheme `exp+mobile`, ключ refresh-token `web_app_demo_refresh_token`, fallback appId в `run-maestro.mjs`). Восстановление — это ещё и ре-брендинг.
- **Офлайн-верификатор не подключён ни к одному клиенту** (mobile не зависит от `@duo-mesh/verifier`) — см. T16/смежное.
- **Не выбирать за пользователя** — это продуктовое решение о судьбе мобильного клиента.
- При архивации: `git show 3841603^` остаётся доступным, история не теряется — можно безопасно чистить ветку.

## Приёмочные критерии

1. Доки больше не ссылаются на несуществующую ветку `mobile`.
2. Либо mobile собирается на `master` с `@duo-mesh/contracts`, либо `mobile/` удалён и доки честно описывают архивацию.

## Валидация

```bash
git for-each-ref | grep mobile        # подтвердить отсутствие ветки
git ls-remote --heads origin | grep mobile
```

## Связанные задачи

- T16 (типы contracts — дрейф имён)
- T19 (устаревшие доки)
