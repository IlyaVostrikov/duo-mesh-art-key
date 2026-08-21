# T12 — Выравнивание конвенций генезиса (спека vs код)

- **Приоритет:** 7/10
- **Стадия:** Stage 2
- **Область:** backend · docs · packages/verifier
- **Статус:** backlog

## Что не так

Три несогласованные конвенции для `prevRecordHash` генезисной записи:

- Спека: `docs/PROVENANCE_SPEC.md:45` — 64 нуля.
- Бэкенд генерация/проверка: `backend/src/services/art-key.service.ts:48,354` — `prevRecordHash: integrityHash`.
- Экспортный роут: `backend/src/routes/art-keys.ts:77` — `p.prevRecordHash ?? ''` (fallback на пустую строку).

Фикстуры противоречат друг другу: `backend/src/crypto/__fixtures__.ts:53` использует `integrityHash`, а `packages/verifier/src/verify.test.ts:54` — `'0'.repeat(64)`.

## Почему это важно

Неоднозначность означает: будущее «ужесточение спеки» сломает одну из сторон. Генезис-якорь — единственная связь с файлами арт-объекта (см. T04). Текущее расхождение делает поведение непредсказуемым.

## Локализация

- `docs/PROVENANCE_SPEC.md:45`
- `backend/src/services/art-key.service.ts:48,354`
- `backend/src/routes/art-keys.ts:77`
- `backend/src/crypto/__fixtures__.ts:53`
- `packages/verifier/src/verify.test.ts:54`

## Минимальная правка

Выбрать одну конвенцию (генезис якорится на `integrityHash`) и выровнять:
1. Экспортный роут всегда пишет сохранённый `prevRecordHash` вместо `''`.
2. `PROVENANCE_SPEC.md` обновить под реализацию.
3. Тестовые фикстуры привести к одной конвенции.

## Подводные камни

- **Это зависит от T04** — сначала проверка `integrityHash` в верификаторе, потом выравнивание конвенций, иначе тесты разойдутся.
- **Не ломать существующие экспорты:** если в проде уже есть экспорты с `''`/64 нулями, изменение роута должно быть совместимым (не переписывать исторические записи).
- **Согласовать с офлайн-верификатором** — он должен принимать выбранную конвенцию.

## Приёмочные критерии

1. Спека, бэкенд, экспортный роут и обе фикстуры используют одну конвенцию.
2. `bun run --cwd backend test:unit` + `bun test packages/verifier` зелёные.

## Валидация

```bash
bun run --cwd backend test:unit
bun test packages/verifier/src/verify.test.ts
```

## Связанные задачи

- T04 (проверка integrityHash в верификаторе)
