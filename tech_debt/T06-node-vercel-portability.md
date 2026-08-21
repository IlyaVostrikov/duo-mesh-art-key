# T06 — Портабельность Node/Vercel + закрыть неавторизованный KDF-роут

- **Приоритет:** 8/10
- **Стадия:** Stage 1
- **Область:** backend
- **Статус:** backlog

## Что не так

Код рассчитан на Bun, но на Vercel исполняется Node; разрыв закрыт рукописным polyfill (`backend/src/polyfills/bun-node.ts`) в одном entrypoint. Bun-специфичные API:

- `backend/src/crypto/hash.ts` L5/L12 — `Bun.CryptoHasher`, `Bun.file`.
- `backend/src/services/upload.service.ts` L149/L153/L258/L261 — `Bun.write`, `Bun.CryptoHasher`.
- `backend/src/routes/kdf-migration.ts` L51 и `backend/scripts/migrate-kdf.ts` L29/L43 — `import.meta.dir ?? __dirname` (в Node ESM `import.meta.dir` отсутствует, `__dirname` undefined → `resolve(undefined, …)` TypeError).
- В `kdf-migration.ts` `resolve(import.meta.dir ?? __dirname, '../data/keystore.salt')` стоит **вне** try/catch — на Vercel Node даёт 500 + стек вместо задуманного сообщения.

Дополнительно: `backend/src/app.ts:260` монтирует `createKdfMigrationRoutes()` на `/` — неавторизованный `POST /run-kdf-migration` (PBKDF2 600k итераций) это DoS-поверхность в проде.

## Почему это важно

- `hash.ts` — горячий крипто-путь (подпись, хеш цепочки); зависит от глобального shim в одном файле. Любой новый entrypoint/скрипт под Node падает с ReferenceError/TypeError.
- Polyfill вводит в заблуждение: `Bun.password` (`bun-node.ts` L30-78) выдаёт `$2b$` bcrypt-префиксные строки, но вычисляет scrypt — «легаси bcrypt» ведёт себя по-разному на Bun vs Node.
- KDF-роут без жёсткого гейта — публичная атака на CPU.

## Локализация

- `backend/src/crypto/hash.ts:5,12` — `Bun.CryptoHasher` / `Bun.file`.
- `backend/src/services/upload.service.ts:149,153,258,261` — `Bun.write` / `Bun.CryptoHasher`.
- `backend/src/routes/kdf-migration.ts:51` — `import.meta.dir ?? __dirname`.
- `backend/scripts/migrate-kdf.ts:29,43` — аналогично.
- `backend/src/polyfills/bun-node.ts:30-78` — `Bun.password` scrypt-vs-bcrypt.
- `backend/src/app.ts:260` — монтаж KDF-роута.

## Минимальная правка

1. `hash.ts`: `Bun.CryptoHasher` → `crypto.subtle.digest('SHA-256', …)` (уже async, совпадает с верификатором); `Bun.file` → `node:fs/promises`.
2. `upload.service.ts`: `Bun.write` → `node:fs/promises.writeFile` (или поток), `Bun.CryptoHasher` → `crypto.subtle`.
3. `import.meta.dir ?? __dirname` → `fileURLToPath(import.meta.url)` (в обоих файлах), и внести salt-чтение внутрь try/catch.
4. Ограничить `POST /run-kdf-migration`: жёсткий seed-token гейт (убедиться, что `x-seed-token` сверяется всегда и роут недоступен без него) или убрать из прод-сборки.

## Подводные камни

- **`crypto.subtle.digest` асинхронный** — все вызовы `sha256Hex`/`hashPayload` должны стать `await`; проверить сигнатуры вызывающих (подпись уже async — хорошо).
- **`hash.ts` используется в fixtures/тестах синхронно?** Проверить `compositeFileHash`/`sha256Hex` — если где-то ожидается синхронный возврат, придётся перевести на async.
- **Не удалять polyfill целиком**, пока есть другие потребители `Bun.*` — чинить точечно, затем оценить остатки.
- **KDF-роут нужен для миграции**, но только с токеном; не отключать саму миграцию (это отдельный трек).

## Приёмочные критерии

1. `bun run --cwd backend scripts/build-vercel.mjs` собирает бандл без Bun-рантайм-зависимостей в `hash.ts`/`upload.service.ts`.
2. `import.meta.dir` отсутствует в `backend/src` и `backend/scripts` (`git grep "import.meta.dir"` пусто).
3. `POST /run-kdf-migration` без валидного `x-seed-token` → 401/403, не выполняет PBKDF2.
4. `bun run --cwd backend test:unit` зелёные.

## Валидация

```bash
bun run --cwd backend scripts/build-vercel.mjs
bun run --cwd backend test:unit
bun run --cwd backend typecheck
```

## Связанные задачи

- T05 (fail-fast)
- T07 (стектрейс)
