# T17 — Расширение покрытия тестами

- **Приоритет:** 7/10
- **Стадия:** Stage 2
- **Область:** backend · webapp · packages/verifier
- **Статус:** backlog

## Что не так

Самый рискованный код без регрессионной защиты:

- **Backend:** `upload.service.ts` (ZIP-bomb-защиты: `readZipMetadata`, reject по compression-ratio, path traversal — всё нетестировано), `art-key.service.ts`, `transparency-log.service.ts`, `certificate-pdf.ts` (29 КБ), `rate-limiter.ts`, `crypto/canonical.ts` (только косвенно через tamper.test), `crypto/hash.ts`. `timestamp.test.ts` (17 строк) проверяет только что нереализованный `verifyTimestampToken` бросает; `requestTimestamp`/`extractGenTime` нетестированы.
- **Webapp:** ноль тестов на `lib/utils.ts` (`parseBilingual*`, `formatPrice`), `use-artist-onboarding.ts`, `lib/auth.tsx`, формы.
- **Verifier:** нет покрытия `2.0.0`-пути (который реально шлёт бэкенд), null-pubkey края, unsupported-version, пустая провенанс.
- **Раскип** `signing.service.test.ts` (см. T08) требует `TEST_DATABASE_URL`.

## Почему это важно

Критичный по безопасности/корректности код без защиты. Билингвальный баг (T03) ушёл в прод именно потому, что `parseBilingual*` round-trip нетестирован.

## Локализация

- `backend/src/services/upload.service.ts`, `backend/src/http/rate-limiter.ts`, `backend/src/crypto/canonical.ts`, `backend/src/services/art-key.service.ts`.
- `webapp/src/lib/utils.ts`, `webapp/src/hooks/use-artist-onboarding.ts`.
- `packages/verifier/src/verify.test.ts`.
- `backend/src/services/signing.service.test.ts` (раскип).

## Минимальная правка

Приоритетный минимальный набор:
1. Backend: canonical cross-consistency (пересекается с T09), ZIP-guard тесты, rate-limiter тест, `requestTimestamp` round-trip (или удалить недостижимый код).
2. Webapp: `parseBilingual/joinBilingual` round-trip (RU/EN/смешанный/отсутствующая половина), `formatPrice` (RUB/USD), `use-artist-onboarding` happy/error.
3. Verifier: `2.0.0` smoke, null-pubkey край, unsupported-version.
4. Раскип signing-теста с `TEST_DATABASE_URL` (CI-джоб).

## Подводные камни

- **Не гнаться за 100% покрытия** — только код, защищающий реальный риск.
- **ZIP-guard тесты** требуют фикстур-архивов (маленькие, в fixtures).
- **`requestTimestamp` может быть нереализованным** — если код недостижим, кандидат на удаление, а не тест.
- **Раскип — инфраструктура** (Postgres), не код; координировать с T08.

## Приёмочные критерии

1. Добавлены целевые тесты из списка, зелёные.
2. `bun run --cwd backend test:unit` (glob из T08) подхватывает их.

## Валидация

```bash
bun run --cwd backend test:unit
bun run --cwd webapp test
bun test packages/verifier/src/verify.test.ts
```

## Связанные задачи

- T08 (glob + раскип)
- T09 (дифференциальный тест)
