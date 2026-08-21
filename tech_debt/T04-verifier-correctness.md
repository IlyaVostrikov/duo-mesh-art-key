# T04 — Офлайн-верификатор: привязать `integrityHash`, починить null-pubkey, сверить `platformSignature`

- **Приоритет:** 8/10
- **Стадия:** Stage 1
- **Область:** packages/verifier
- **Статус:** backlog

## Что не так

В `packages/verifier/src/verify.ts` три дефекта:

1. **Генезис не привязан к `integrityHash`.** Цикл (L180-214) проверяет `prevRecordHash === chainHash` только для `i > 0`; у первой записи (`i === 0`) `prevRecordHash` не сверяется с `artKey.integrityHash`. Значит офлайн-путь **не связывает** экспорт с файлами арт-объекта криптографически — атакующий может подменить `integrityHash`, и это пройдёт.
2. **Запись с `signature` заданным и `signerPublicKey === null` проходит молча.** Ветки L216-233: `if (signature && signerPublicKey)` / `else if (!signature)`. Третий случай (signature есть, pubkey null) не попадает ни в одну — `hasRequiredSigs` остаётся `true`, `allSigsValid` не меняется. Малformed-запись проходит крипто-гейт.
3. **`artKey.platformSignature` не сверяется** с PLATFORM-косинью в провенанс, которую реально проверяет верификатор (L238-259). Они могут молча разойтись.

## Почему это важно

Верификатор — единственный путь доверия, не зависящий от сервера. Офлайн-верификация даёт более слабые гарантии, чем онлайн (`art-key.service.ts:236` проверяет `prevRecordHash === integrityHash`, а верификатор — нет), и малformed/truncated-экспорт может дать ложный `valid`.

## Локализация

- `packages/verifier/src/verify.ts:180-214` — цикл (нет проверки генезиса).
- `packages/verifier/src/verify.ts:216-233` — пропущенный случай null-pubkey.
- `packages/verifier/src/verify.ts:238-259` — платформенная косинь.
- `backend/src/services/art-key.service.ts:236` — онлайн-проверка `integrityHash` (эталон).

## Минимальная правка

1. В начале цикла: для `i === 0` добавить `CHAIN`-проверку `entry.payload.prevRecordHash === data.artKey.integrityHash` (если `integrityHash` не пустой/нулевой).
2. Добавить `else if (entry.signature && !entry.signerPublicKey)` ветку: `allSigsValid = false; hasRequiredSigs = false` + `SIGNATURE` check с `pass: false`.
3. Если `artKey.platformSignature` задан, сверить, что существует PLATFORM-запись с этим `signature` (либо что платформенная косинь валидна), иначе пометить несоответствие.

## Подводные камни

- **Конвенции генезиса разъехались** (спека 64 нуля / бэкенд `integrityHash` / экспорт `''`). Не пытаться выровнять их здесь — это T12. Проверку `integrityHash` писать устойчиво к текущему состоянию (например, сверять только когда `integrityHash` не равен `'0'.repeat(64)` и не пуст), иначе сломаются существующие фикстуры.
- **`isCoSig`-ветка** (L197-198): косинь делит `prevRecordHash` с основной записью. Проверку генезиса не ломать для косинь-записей.
- **Не менять сигнатуру `verifySignedExport`** в этой задаче (инжектируемый trust-anchor — это T01). Здесь только исправление логики.
- Добавить тест-векторы на каждый из трёх дефектов.

## Приёмочные критерии

1. Экспорт с подменённым `integrityHash` → `verified: false` + CHAIN-fail.
2. Запись с `signature` заданным и `signerPublicKey: null` → `verified: false` (не `true`).
3. Расхождение `artKey.platformSignature` с провенанс-косинью → зафиксировано в checks.
4. Существующие `verify.test.ts` и `tamper.test.ts` зелёные.

## Валидация

```bash
bun test packages/verifier/src/verify.test.ts
bun run --cwd backend test:unit   # tamper.test.ts
```

## Связанные задачи

- T01 (trust-anchor)
- T12 (выравнивание конвенций генезиса)
- T09 (дифференциальный тест)
