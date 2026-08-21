# T05 — Fail-fast на старте + убрать runtime-DDL и автопереотзыв ключей

- **Приоритет:** 8/10
- **Стадия:** Stage 1
- **Область:** backend
- **Статус:** backlog

## Что не так

1. `backend/src/app.ts` L136-140 оборачивает `ensureKeys()` в `catch { console.error }` — любая ошибка инициализации ключей логируется и **игнорируется**; `/health` (L183) всегда возвращает `ok`.
2. `backend/src/services/signing.service.ts` L33-36 выполняет `ALTER TABLE signing_keys ADD COLUMN IF NOT EXISTS encrypted_private_key JSONB` на **каждом** холодном старте (runtime-DDL в boot-пути).
3. `backend/src/services/signing.service.ts` L106-110 безусловно делает `UPDATE … SET is_active=false, revoked_at=NOW() WHERE is_active=true AND encrypted_private_key IS NULL AND owner_type != 'PLATFORM'` — автопереотзывает ключи художников.

## Почему это важно

- Из-за глотания ошибок стартует «здоровое» приложение, а первый же запрос подписи 500-ит — мониторинг (`/health`) слеп к поломке. Именно так незамеченной остаётся незавершённая KDF-миграция.
- Автопереотзыв при неполной миграции **тихо и необратимо** переотзывает активные ключи художников, у которых `encrypted_private_key IS NULL` — дата-лосс.
- Runtime-DDL хрупко между средами и скрывает реальные ошибки DDL (окружающий `catch` их глотает).

## Локализация

- `backend/src/app.ts:136-140` — swallowed `ensureKeys()`.
- `backend/src/app.ts:183` — безусловный `ok` в `/health`.
- `backend/src/services/signing.service.ts:33-36` — runtime `ALTER TABLE`.
- `backend/src/services/signing.service.ts:106-110` — автопереотзыв.
- Миграция `20260818001000_add_signing_key_encrypted_private_key` — колонка уже есть в Prisma-миграции.

## Минимальная правка

1. Пусть `ensureKeys()` валит запуск при ошибке (или выставляет health-флаг, который `/health` отражает как `degraded`/`503`).
2. Удалить runtime `ALTER TABLE` (полагаться на `prisma migrate deploy`).
3. Убрать автопереотзыв (восстановление ключей — ручное и аудируемое) или гейтить явным операторским флагом.

## Подводные камни

- **Fail-fast может «сломать» деплой**, если проду реально не хватает ключа/соли. Это и есть цель — но стоит свериться с текущим прод-состоянием KDF-миграции, чтобы не завалить уже работающий (но частично) прод. Согласовать с треком KDF-миграции (отдельный агент).
- **`/health` используется мониторингом/деплоем** — меняя его на `degraded`, проверить, что не сломается readiness-проверка Vercel.
- **Не удалять логику генерации ключа** в `ensureKeys()` — только убрать побочные DDL/автопереотзыв и честную ошибку.
- `warmKey()` тоже глотает ошибку (`signing.service.ts:116-118`) — привести к тому же fail-fast/флагу.

## Приёмочные критерии

1. При сломанном `ensureKeys()` приложение не стартует со статусом `ok` (валится либо `/health` → `degraded`).
2. `ALTER TABLE` больше не выполняется в boot-пути (`git grep "ALTER TABLE" backend/src` — пусто вне миграций).
3. Автопереотзыв удалён или за операторским флагом.
4. Существующие тесты зелёные, `bun run --cwd backend typecheck` проходит.

## Валидация

```bash
bun run --cwd backend test:unit
bun run --cwd backend typecheck
# локально: поднять приложение без ключа и убедиться, что /health честный
```

## Связанные задачи

- T06 (портабельность + KDF-роут)
- T08 (тест-инфраструктура)
