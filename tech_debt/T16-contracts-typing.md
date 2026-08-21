# T16 — Причёсывание типов contracts

- **Приоритет:** 6/10
- **Стадия:** Stage 2
- **Область:** packages/contracts
- **Статус:** backlog

## Что не так

1. **Write-only схемы** никогда не валидируют реальные данные: `searchResultSchema`, `artistListSchema`, `artworkListSchema`, `notificationTypeSchema`, `artKeyVerificationSchema`. Бэкенд-роуты используют свои локальные query/pagination-схемы; ни один роут не валидирует **ответ** против общей схемы.
2. **Несогласованность ID-типов:** `userSchema.id` = `z.string()`, но `artistSchema.userId`/`provenanceRecordSchema.fromUserId/toUserId` = `z.string().uuid()`. Реальные user-id — не UUID (`webapp` фикстура `user_1`), так что UUID-валидаторы отвергли бы реальные данные.
3. **Enum-как-строка:** `exhibitionHallPublicSchema.artworks` и `searchResultSchema` типизируют `category`/`status`/`transferType` как `z.string()` вместо общих enum-схем.
4. **Флип `price`/`currency`:** `artworkFieldsSchema.price` = `z.number().positive()` на входе, `artworkSchema.price` = `z.string().nullable()` на выходе; `currency` дефолт `'RUB'` зашит.
5. **`FEATURED_CONFIG`** (`featured.ts:4-53`) — сид/кураторские данные, а не Zod-контракт, лежат в packages/contracts.

## Почему это важно

«Единый источник истины» — аспирация, а не факт: дрейф вывода молчалив, пока потребитель не упадёт. Несогласованные ID-типы — либо контракт, либо данные неверны. Enum-как-строка ослабляет валидацию там, где важнее всего (provenance transfer types).

## Локализация

- `packages/contracts/src/{art-keys,artists,artworks,social,halls,featured}.ts`.

## Минимальная правка

1. Удалить неиспользуемые list/result-схемы (дешевле) **или** валидировать ответы бэкенда на границе роута (`schema.parse` в хендлере).
2. Выбрать один ID-тип (UUID) и применить равномерно, либо сделать user-id `z.string()` везде, где течёт user-id.
3. Заменить `z.string()` enum-поля на общие enum-схемы.
4. Выбрать одно представление `price` (string) на входе и выходе; `'RUB'` вынести в именованную константу.
5. Перенести `FEATURED_CONFIG` в backend (или `packages/content`), веб читает через API.

## Подводные камни

- **Синхронизировать с продюсерами/потребителями** (backend + webapp) — изменение контракта ломает обе стороны; сверяться с реальной формой ответов.
- **Не валидировать то, что не нужно** — если схема не используется и не будет, удалить, а не раздувать.
- **`z.input` vs `z.infer`** в `halls.ts:59` расходятся с соседями — привести к одному стилю.

## Приёмочные критерии

1. Write-only схемы удалены или реально валидируют ответы.
2. ID-типы согласованы.
3. `bun test packages/contracts` + `bun run --cwd backend test:unit` + `bun run --cwd webapp build` зелёные.

## Валидация

```bash
bun test packages/contracts
bun run --cwd backend test:unit
bun run --cwd webapp build
```

## Связанные задачи

- T10 (verification schema)
- T11 (mobile дрейф имён)
