# План исправлений

## Общие ограничения

- Не начинать с массового рефакторинга.
- Не менять production secrets, ключи, данные или инфраструктуру без владельца.
- Каждая ветка/PR должна закрывать небольшой связный набор ID.
- Миграции Prisma генерировать штатным workflow, не писать `migration.sql` вручную.
- Для security/integrity изменений сначала зафиксировать негативный тест.

## Этап A — containment

Цель: прекратить опасные изменения данных до исправления модели.

1. P0-12: feature-flag/disable завершение purchase.
2. P0-13: feature-flag/disable manual transfer либо сериализовать операцию немедленно.
3. P0-10: запретить произвольный storage delete/download.
4. P1-05 и P1-06: отключить небезопасный cleanup и ограничить ZIP processing.
5. P0-03/P0-04: выполнить только read-only production fingerprint/config audit; подготовить отдельный rotation plan.

Primary signal: потенциально необратимые действия больше нельзя вызвать небезопасным клиентским запросом.

## Этап B — криптографический контракт

Зависимости: выполнять P0-01 до полного исправления export и verifier.

1. Определить `ProvenancePayloadV2` в shared contracts/spec.
2. Включить точный `occurredAt`, IDs подписантов, owner IDs и все audit-relevant поля.
3. Выбрать JCS или строго определённую recursive canonicalization.
4. Сохранять payload version и signer key IDs.
5. Проверять каждую запись историческим public key.
6. Исправить export: signed payload отдельно от presentation metadata.
7. Ввести результат verification: `valid`, `invalid`, `indeterminate`, `unsupported-version`.
8. Добавить offline integration test generate → export → verifier.

Закрывает: P0-01, P0-02, P1-02, P1-03, P2-11.

## Этап C — атомарный ledger

1. Добавить unique constraint `(artKeyId, sequence)`.
2. Перенести issuance в одну transaction.
3. Перенести transfer, owner update, provenance и transparency entry в одну serializable transaction/lock.
4. Повторно проверять current owner внутри transaction.
5. Запретить hard delete immutable records; ввести archive/tombstone.
6. Определить migration/compatibility для существующих данных.

Закрывает: P0-13, P0-14, P1-01, P2-12 частично.

## Этап D — storage integrity и authorization

1. Ввести storage object manifest: owner, artwork, key, type, size, checksum, version/ETag, visibility, state.
2. Presign должен создавать pending manifest.
3. Finalize должен HEAD/checksum-проверять storage object.
4. ArtKey подписывает finalized immutable manifest.
5. Download/delete проверяет ACL по manifest.
6. Нормализовать mounted path и проверить cold start.
7. Согласовать лимиты 3D/ZIP/storage.
8. Перейти на bounded ZIP extraction с гарантированным rollback.

Закрывает: P0-05, P0-10, P0-11, P1-05, P1-06, P1-07.

## Этап E — purchase model

Требуется решение владельца продукта:

- Вариант 1, рекомендуемый до интеграции платежей: endpoint создаёт только purchase inquiry и не меняет sale/ownership.
- Вариант 2: payment provider + pending sale + trusted webhook + idempotency + reservation/timeout/refund model.

В обоих вариантах:

- только LISTED artwork;
- buyer не является current owner/artist;
- currency и decimal amount фиксируются из listing;
- client request не способен самостоятельно создать COMPLETED sale;
- повтор запроса/webhook безопасен.

Закрывает: P0-12.

## Этап F — публичный сайт

1. Закрыть XSS без `innerHTML` для API-данных.
2. Выбрать SSR/hybrid/real SSG paths для динамических страниц.
3. Оставить один typed website client.
4. Исправить verify и hall contracts.
5. Убрать localhost CTA; добавить documented env.
6. Перенести SEO-контент в исходный HTML.
7. Добавить E2E для artwork/artist/hall/verify и XSS fixtures.

Закрывает: P0-06—P0-09, P1-15—P1-17, P1-26, P2-05, P2-06, P2-09, P2-10.

## Этап G — маршруты, auth и abuse protection

1. Зафиксировать final mounted paths contract tests.
2. Исправить auth limiter и transparency URLs.
3. Централизовать public visibility predicate.
4. Добавить session revocation policy.
5. Защитить inquiry endpoint от spam.
6. Валидировать query enums через shared schemas.
7. Отделить read lookup от view increment.

Закрывает: P1-08—P1-14.

## Этап H — build, CI и документация

1. Согласовать default branch и CI trigger.
2. Исправить backend auth tests и webapp E2E.
3. Включить verifier/website в обязательный suite.
4. Сделать serverless bundle воспроизводимым или добавить freshness assertion.
5. Исправить package ownership `fflate`/`esbuild` без ненужных новых dependencies.
6. После стабилизации обновить README, deployment, database, testing и security/key-rotation docs.

Закрывает: P1-19—P1-26, P2-01—P2-04.

## Предлагаемые независимые PR

1. `security/contain-dangerous-mutations`
2. `security/rotate-and-version-trust-root` — только после решения владельца
3. `integrity/provenance-payload-v2`
4. `integrity/atomic-ledger`
5. `storage/object-manifest-and-acl`
6. `website/safe-rendering-and-routes`
7. `purchase/state-machine`
8. `quality/restore-ci-and-e2e`
9. `docs/align-product-runbooks`
