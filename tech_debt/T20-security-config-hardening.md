# T20 — Безопасность конфигурации: rate-limiter, тайминг хеша, env.ts

- **Приоритет:** 6/10
- **Стадия:** Stage 2
- **Область:** backend
- **Статус:** backlog

## Что не так

1. **In-memory rate-limiter** (`backend/src/http/rate-limiter.ts`): счётчики per-process. На Vercel serverless каждый инстанс имеет свои; ключ берёт первый `x-forwarded-for` hop (спуфабелен). Один `setInterval` на каждый смонтированный лимитер (5-6 на приложение). Тестов нет.
2. **`DUMMY_PASSWORD_HASH`** (`backend/src/auth/service.ts:32`) — строка `$2b$` bcrypt-формата, а реальные хеши из `auth/passwords.ts` — `$argon2id$`. `verifyPassword` гонит dummy через `Bun.password.verify` (polyfill scrypt на Node, native bcrypt на Bun), реальных пользователей — через Argon2: разные алгоритмы и cost. Цель «время неотличимо от реальной неверной попытки» не достигается.
3. **`env.ts` не единственный источник истины**: `KEYSTORE_SALT`, `SEED_TOKEN`, `PLATFORM_PRIVATE_KEY_HEX`, `VERCEL` читаются напрямую `process.env` в `app.ts` L8/L107, `signing.service.ts` L48/L50, `seed.ts` L22, `kdf-migration.ts` L33/L48. `KEYSTORE_SALT` — security-чувствителен, но отсутствует в схеме.

## Почему это важно

Брутфорс-защита `/auth/login|register` обходима между инстансами и ротацией `X-Forwarded-For` — косметическая в проде. Тайминг-выравнивание ломано. Опечатка/ротация соли молча ломает подпись; секреты в env расширяют поверхность утечки.

## Локализация

- `backend/src/http/rate-limiter.ts`.
- `backend/src/auth/service.ts:32`, `backend/src/auth/passwords.ts`.
- `backend/src/env.ts` (нет `KEYSTORE_SALT`/`SEED_TOKEN`).

## Минимальная правка

1. Rate-limiter: ключ из **полной** цепочки `x-forwarded-for` (или её хеша), документировать как best-effort (реальная защита — Vercel/WAF). Не строить распределённый лимитер.
2. `DUMMY_PASSWORD_HASH` сделать реальным argon2id-хешем случайной строки (посчитать один раз), чтобы обе ветки шли одним путём.
3. Добавить `KEYSTORE_SALT` (64-hex валидация) и `SEED_TOKEN` в Zod-схему, читать через `env`.

## Подводные камни

- **Не строить распределённый rate-limiter** — это явно за гранью «минимально достаточно».
- **`PLATFORM_PRIVATE_KEY_HEX`** — аварийный escape-hatch, инжектящий сырой приватный ключ из env; обсудить вывод из эксплуатации (связано с T01).
- **Замена `DUMMY_PASSWORD_HASH`** — не менять cost реального Argon2, только сделать dummy тем же алгоритмом.
- **Добавление полей в env.ts** может «сломать» старт в средах без `KEYSTORE_SALT` — сделать необязательным с дефолтом из файла соли (см. текущее поведение keystore).

## Приёмочные критерии

1. Rate-limiter использует полную цепочку `x-forwarded-for`.
2. `DUMMY_PASSWORD_HASH` — argon2id, обе ветки `verifyPassword` одним путём.
3. `KEYSTORE_SALT`/`SEED_TOKEN` валидируются в `env.ts`.
4. `bun run --cwd backend test:unit` + typecheck зелёные.

## Валидация

```bash
bun run --cwd backend test:unit
bun run --cwd backend typecheck
```

## Связанные задачи

- T01 (PLATFORM_PRIVATE_KEY_HEX)
- T05 (fail-fast — env/startup)
