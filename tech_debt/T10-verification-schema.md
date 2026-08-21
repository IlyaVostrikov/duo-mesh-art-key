# T10 — Починить `artKeyVerificationSchema` + валидировать страницу проверки

- **Приоритет:** 7/10
- **Стадия:** Stage 1
- **Область:** packages/contracts · webapp
- **Статус:** backlog

## Что не так

1. `packages/contracts/src/art-keys.ts:50-55` `artKeyVerificationSchema` описывает **DB-форму** (вложенный `artwork` внутри `artKey`, полный `provenanceRecordSchema[]`), а реальный `verify()` в `backend/src/services/art-key.service.ts:387-433` возвращает `{ artKey, artwork, artist, provenance, verified, checks, currentOwner }`. Схема мертва (единственный потребитель — `backend/src/art-key.test.ts:253`) и не соответствует реальному ответу.
2. `webapp/src/pages/verify/VerifyResultPage.tsx:10-50` рукописно объявляет `VerifyResult`-интерфейс, а `:63-67` делает `const json = await res.json()` без схемы — дрейф бэкенда молча ломает страницу в рантайме.

## Почему это важно

Общий «контракт» самой важной функции (результат верификации) неверен, поэтому никто не может по нему валидировать. Будущий потребитель (например, восстановленный mobile) молча разойдётся с бэкендом.

## Локализация

- `packages/contracts/src/art-keys.ts:50-55` — устаревшая схема.
- `backend/src/services/art-key.service.ts:387-433` — реальная форма ответа.
- `webapp/src/pages/verify/VerifyResultPage.tsx:10-50,63-67` — рукописный тип + невалидируемый fetch.
- `backend/src/art-key.test.ts:253` — единственный потребитель схемы.

## Минимальная правка

1. Переписать `artKeyVerificationSchema` под реальный ответ `verify()`.
2. Провалидировать ответ в `VerifyResultPage` через схему (как auth-клиент в `webapp/src/lib/api.ts` — `schema.safeParse` + нормализованная ошибка).

## Подводные камни

- **Источник истины — форма ответа `verify()`**, а не схема. Сверить с актуальным кодом сервиса (поля `artwork`, `artist`, `checks`, `currentOwner`), а не с текущей схемой.
- **`artKeyPublicSchema`** требует вложенный `artwork` внутри `artKey` — в реальном `verify()` этого нет. Переиспользовать только то, что совпадает.
- **Не ломать `backend/src/art-key.test.ts:253`** — обновить его под новую схему или перевести на реальный ответ.
- Не дублировать интерфейс в `VerifyResultPage` — импортировать `z.infer` из contracts.

## Приёмочные критерии

1. `artKeyVerificationSchema` соответствует реальному ответу `verify()` (валидирует настоящий ответ).
2. `VerifyResultPage` импортирует тип из contracts и валидирует fetch через `safeParse`.
3. `bun test` в `packages/contracts` + `bun run --cwd webapp build` зелёные.

## Валидация

```bash
bun test packages/contracts
bun run --cwd webapp build
bun run --cwd backend test:unit   # art-key.test.ts
```

## Связанные задачи

- T16 (типы contracts)
