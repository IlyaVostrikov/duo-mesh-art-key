# Полный реестр проблем

Статусы в этом документе исходные: `OPEN`. Агент должен менять статус только после повторного подтверждения и проверки исправления.

## P0 — блокирующие

### P0-01 — Подпись и проверка provenance используют разные timestamps

- Статус: OPEN
- Область: backend / ArtKey / provenance
- Файлы: `backend/src/services/art-key.service.ts`, `backend/src/services/provenance-transfer.service.ts`, `backend/prisma/schema.prisma`
- Доказательство: при подписи используется локальный `issuedAt`/`occurredAt`, а при вставке provenance точный timestamp не сохраняется. База создаёт собственный `createdAt`; проверка затем собирает payload с ним.
- Риск: легитимная запись не проходит проверку; подпись невозможно воспроизвести.
- Исправление: добавить неизменяемый `occurredAt`, версию payload и хранить точное каноническое представление либо гарантированно воспроизводимые поля.
- Приёмка: новая запись проходит online и offline verification; повторная сериализация побайтно совпадает с подписанной.

### P0-02 — Offline export заменяет подписанные ID именами

- Статус: OPEN
- Область: backend / export / verifier
- Файл: `backend/src/routes/art-keys.ts`
- Доказательство: исходная подпись использует owner IDs, экспорт формирует `fromOwnerName`/`toOwnerName`.
- Риск: настоящий экспорт отклоняется; отображаемые данные подменяют криптографические.
- Исправление: экспортировать точный подписанный payload и отдельно presentation metadata.
- Приёмка: экспорт новой записи успешно проходит CLI verifier без преобразования полей.

### P0-03 — Приватный ключ соответствует закреплённому trust root

- Статус: OPEN / SECURITY INCIDENT CHECK REQUIRED
- Область: verifier / key management
- Файлы: `packages/verifier/src/verify.ts`, `packages/verifier/src/verify.test.ts`
- Доказательство: тестовый приватный ключ соответствует публичному ключу, который verifier принимает как платформенный root.
- Риск: если эта пара использована production, злоумышленник способен выпускать принимаемые подписи.
- Исправление: сравнить fingerprint с production, при совпадении ротировать root, удалить ключ из истории использования, применять ephemeral test keys и versioned trust store.
- Приёмка: production root не имеет приватной части в репозитории; тесты генерируют изолированную пару; старые/новые anchors обрабатываются по документированной политике.

### P0-04 — Production допускает известный SECRET_STORE_KEY

- Статус: OPEN / SECURITY INCIDENT CHECK REQUIRED
- Область: backend / secrets
- Файл: `backend/src/env.ts`
- Доказательство: `SECRET_STORE_KEY` имеет публичный placeholder default, production validation его не отклоняет.
- Риск: приватные signing keys можно расшифровать из БД при запуске с default.
- Исправление: сделать секрет обязательным в production, запретить placeholder/слабые значения; при использовании default ротировать и повторно зашифровать ключи.
- Приёмка: production startup завершается ошибкой без сильного секрета; rotation runbook проверен отдельно.

### P0-05 — Целостность файлов основана на клиентском утверждении

- Статус: OPEN
- Область: webapp / upload / storage / ArtKey
- Файлы: `webapp/src/lib/upload.ts`, `backend/src/routes/artworks.ts`, `backend/src/services/art-key.service.ts`
- Доказательство: браузер вычисляет хеш, backend подписывает переданную карту, но не сверяет её с реальным объектом storage.
- Риск: пользователь может подписать произвольный хеш; замена объекта не обнаруживается.
- Исправление: server-side finalize, checksum/size/object-version manifest, неизменяемая привязка manifest к ArtKey.
- Приёмка: неверный клиентский хеш отклоняется; замена байтов объекта ломает verification.

### P0-06 — Stored XSS в публичном website

- Статус: OPEN
- Область: website / security
- Файлы: `website/src/pages/artworks.astro`, `website/src/pages/artists.astro`, `website/src/pages/artworks/[id].astro`, `website/src/pages/artists/[id].astro`, `website/src/pages/halls/[slug].astro`
- Доказательство: поля API интерполируются в `innerHTML` без экранирования.
- Риск: выполнение пользовательского JavaScript у посетителей.
- Исправление: безопасный Astro/DOM rendering; `textContent` и безопасная установка атрибутов; запрет HTML для обычных текстовых полей.
- Приёмка: XSS fixtures отображаются как текст и не исполняются.

### P0-07 — Динамические Astro-страницы генерируют только путь `view`

- Статус: OPEN
- Область: website / routing
- Файлы: `website/src/pages/artworks/[id].astro`, `website/src/pages/artists/[id].astro`, `website/src/pages/halls/[slug].astro`
- Доказательство: `getStaticPaths()` возвращает только dummy path.
- Риск: прямой переход к реальным UUID/slug даёт 404 на static hosting.
- Исправление: SSR/hybrid либо реальная генерация paths на build.
- Приёмка: прямые переходы и browser refresh для реальных сущностей возвращают 200.

### P0-08 — Страница verify не соответствует API

- Статус: OPEN
- Область: website / API contract
- Файлы: `website/src/pages/verify.astro`, `website/public/api-client.js`, `backend/src/routes/art-keys.ts`
- Доказательство: вызывается отсутствующий `artworks.verifyKey`; страница ожидает другую форму ответа.
- Риск: публичная проверка ArtKey не работает или неверно показывает результат.
- Исправление: использовать shared contract и реальный `artKeys.verify`; обработать valid/invalid/not-found/error.
- Приёмка: известный валидный ключ отображается валидным, изменённый — невалидным, неизвестный — найденным не считается.

### P0-09 — Hall page использует поле `images`, которого нет в DTO

- Статус: OPEN
- Область: website / backend contract
- Файлы: `website/src/pages/halls/[slug].astro`, `backend/src/services/hall.service.ts`
- Доказательство: website читает `aw.images[0]`, backend отдаёт `posterUrl`.
- Риск: страница зала падает при наличии работ.
- Исправление: типизировать DTO общим контрактом и использовать `posterUrl` либо согласованную модель изображений.
- Приёмка: зал без работ и зал с несколькими работами отображаются без runtime error.

### P0-10 — Download/delete storage object не проверяет владельца

- Статус: OPEN
- Область: backend / storage authorization
- Файлы: `backend/src/routes/uploads.ts`, `backend/src/app.ts`, `backend/src/services/storage.service.ts`
- Доказательство: авторизованный Artist/Admin может передать произвольный key; serverless fallback не связывает key с объектной ACL.
- Риск: чтение или удаление чужих файлов.
- Исправление: storage manifest/table с owner, visibility, lifecycle state; авторизация по записи; public fallback только для public object.
- Приёмка: пользователь B не может получить URL или удалить объект A; публичный объект доступен только по явно разрешённому пути.

### P0-11 — Cold-start storage fallback неправильно нормализует key

- Статус: OPEN
- Область: backend / Vercel / storage
- Файл: `backend/src/app.ts`
- Доказательство: удаляется `/api/`, но остаётся начальный `/`; storage validator запрещает такие keys, исключение превращается в 404.
- Риск: существующие assets недоступны после cold start.
- Исправление: единая нормализация final mounted path с тестом; выполнять вместе с P0-10.
- Приёмка: разрешённый asset доступен после cold start, запрещённый остаётся недоступным.

### P0-12 — Покупка завершается без подтверждённой оплаты

- Статус: OPEN
- Область: backend / purchase / ownership
- Файл: `backend/src/routes/purchase.ts`
- Доказательство: обычный POST создаёт COMPLETED sale, SOLD status, provenance и ownership без payment authorization/webhook/idempotency.
- Риск: бесплатная смена собственности, повторные продажи и неверный финансовый учёт.
- Исправление: временно отключить endpoint; затем либо оформить inquiry flow, либо платёжную state machine с доверенным webhook как source of truth.
- Приёмка: запрос клиента сам по себе не завершает продажу; повтор webhook идемпотентен; self-purchase и неподходящие статусы запрещены; currency сохраняется точно.

### P0-13 — Конкурентные transfers разветвляют provenance

- Статус: OPEN
- Область: backend / transactions / provenance
- Файлы: `backend/src/routes/transfers.ts`, `backend/src/services/provenance-transfer.service.ts`, `backend/prisma/schema.prisma`
- Доказательство: owner check и next sequence выполняются вне общей serializable transaction; нет unique `(artKeyId, sequence)`.
- Риск: две успешные передачи одного состояния и fork цепочки.
- Исправление: transaction/locking, повторная проверка owner, unique constraint, атомарная запись transfer + provenance + transparency; подписывать audit-relevant поля.
- Приёмка: две конкурентные передачи дают один success и один conflict; sequence уникален и непрерывен.

### P0-14 — Hard delete уничтожает историю

- Статус: OPEN
- Область: backend / persistence / retention
- Файлы: `backend/src/routes/artworks.ts`, `backend/src/services/artwork.service.ts`, `backend/prisma/schema.prisma`
- Доказательство: Artwork физически удаляется, cascade удаляет ArtKey/provenance/sales.
- Риск: исчезновение выпущенного сертификата и истории владения.
- Исправление: archive/tombstone; запрет hard delete после issuance/sale; Restrict/NoAction для immutable ledger.
- Приёмка: выпущенная/проданная работа не удаляется физически; история остаётся проверяемой.

## P1 — высокий приоритет

### P1-01 — Неатомарный выпуск Artwork/ArtKey

Цепочка artwork → ArtKey → genesis provenance → transparency выполняется несколькими независимыми writes. Нужны транзакция, идемпотентность и тесты отказа на каждом шаге.

### P1-02 — Отсутствующие proof-поля не делают verification неуспешным

Проверка может пропустить отсутствующую подпись, presence timestamp token представляется как успешная проверка, пустой transparency log может дать `allOk`. Нужна явная политика `valid/invalid/indeterminate/legacy`.

### P1-03 — Исторические записи проверяются текущим активным ключом

После rotation старые platform signatures могут проверяться не по `platformSigningKeyId`. Export также должен использовать signer key конкретной записи.

### P1-04 — Runtime schema mutation и fail-open startup

`SigningService.ensureKeys` выполняет `ALTER TABLE ... ADD COLUMN` через `$executeRawUnsafe`; ошибка подавляется, приложение продолжает обслуживать запросы. Перенести в Prisma migration и сделать readiness зависимым от signing subsystem.

### P1-05 — Cleanup удаляет старые файлы без проверки ссылок

`UploadService.cleanupOrphaned` определяет orphan только по возрасту. Нужны manifest/reference check, dry-run, quarantine и audit log.

### P1-06 — ZIP bomb и утечки частичных файлов

`unzipSync` распаковывает архив до проверки общего uncompressed budget; rollback не гарантирован для частичного extraction. Нужны streaming/bounded extraction, ratio/entry/total limits и cleanup в `finally`.

### P1-07 — Конфликт лимитов загрузки и неодинаковая семантика ZIP

3D limit по умолчанию 100 МБ, storage limit — 10 МБ. Presigned ZIP хранится непрозрачно, legacy flow распаковывает assets. Нужны единые лимиты и одно продуктовое поведение.

### P1-08 — Несогласованная публичная видимость

ARCHIVED может попадать в список, DRAFT/ARCHIVED — открываться по UUID, неопубликованный hall — по slug. Нужен единый visibility predicate с owner/admin exceptions.

### P1-09 — Auth rate limiter смонтирован не на итоговый маршрут

Inner app использует `/auth`, limiter зарегистрирован на `/api/auth/*`, а внешний app добавляет `/api`. Нужен contract test итогового mounted URL.

### P1-10 — Двойной сегмент transparency route

Router монтируется в `/transparency`, а child routes снова объявляют `/transparency`. Проверить фактические URL и убрать дублирование.

### P1-11 — Revoked session не проверяется большинством guards

Guards валидируют JWT и пользователя, но не active/revoked session. Stolen access token действует до expiry. Нужна документированная revocation model или проверка session/session-version.

### P1-12 — Public inquiry не защищён от abuse

Публичный endpoint создаёт DB rows и notifications без rate limit/captcha/honeypot. Добавить abuse protection и проверку публичной видимости artwork.

### P1-13 — Invalid enum filters дают server error

Query strings кастуются к Prisma enums без shared Zod validation. Невалидный фильтр должен возвращать 400.

### P1-14 — Внутренние операции загрязняют счётчик просмотров

Update/delete используют публичный `getById`, который увеличивает views. Разделить lookup и view-tracking.

### P1-15 — Astro не отдаёт основной SEO-контент в HTML

Каталог и профили первоначально содержат loading placeholders и получают данные client-side. Перенести публичные данные в SSR/SSG там, где это возможно.

### P1-16 — Production CTA ведёт на localhost и отсутствующий route

Главная website содержит `http://localhost:5173/register`, а webapp использует `/login` и внутренний режим регистрации. Нужны `PUBLIC_WEBAPP_URL` и поддерживаемый register URL.

### P1-17 — Два API-клиента website уже разошлись

`website/src/lib/api.ts` и `website/public/api-client.js` вручную дублируют backend DTO. Оставить один typed client на `@duo-mesh/contracts`.

### P1-18 — Webapp обходит общий client/contracts

Много прямых fetch-вызовов имеют собственные error/refresh/cache semantics. Консолидировать вокруг существующего API client и TanStack Query, без лишней абстракции.

### P1-19 — Committed serverless bundle может не соответствовать source

`backend/api/index.js` хранится в Git, Vercel build делает `echo pre-built`, freshness check отсутствует. Собирать воспроизводимо при deploy или падать при drift.

### P1-20 — Backend не объявляет прямую зависимость `fflate`

Backend импортирует package, объявленный только на другом workspace-уровне. Добавить dependency в owning package либо убрать импорт.

### P1-21 — Build script не объявляет `esbuild`

Инструмент используется скриптом, но не зафиксирован в package manifests. Добавить как dev dependency только после проверки существующей package policy.

### P1-22 — CI не запускается на default branch

`.github/workflows/ci.yml` слушает `main`, default branch — `master`. Для проверенного коммита workflow runs отсутствуют; есть только Vercel status.

### P1-23 — Backend auth test использует неправильный lifecycle и path

`createApp` асинхронен, но не await; тест обращается к `/api/auth` на inner app, где route начинается с `/auth`.

### P1-24 — Webapp auth E2E проверяет удалённый интерфейс

Тест ожидает auth UI на `/` и элементы старого flow; текущая авторизация расположена на `/login` и имеет другой state flow.

### P1-25 — Verifier tests не входят в общий test command

У verifier package нет согласованного `test` script, а root suite явно его не запускает. Добавить пакет в обязательные проверки.

### P1-26 — Website не имеет критических интеграционных/E2E тестов

Нет защиты для динамических routes, verify contract, hall DTO и XSS rendering.

## P2 — рефакторинг и продуктовый долг

### P2-01 — README остаётся шаблонным

Корневой README описывает Vibe Coding Template, а не фактический продукт, setup и boundaries DUO MESH.

### P2-02 — Deployment docs расходятся с текущей инфраструктурой

Документация преимущественно описывает DigitalOcean, код и текущий deploy используют Vercel/Neon/R2-сценарии. Зафиксировать реальный source of truth.

### P2-03 — Имена локальных БД не согласованы

Docker Compose использует `duo_mesh`/`duo_mesh_test`, env/docs — `web_app_demo`/`web_app_demo_test`.

### P2-04 — Устаревшее имя refresh cookie

Cookie называется `web_app_demo_refresh`. Переименование требует backward-compatible rollout.

### P2-05 — Website local environment может обращаться к production API

Нет безопасного `website/.env.example`; определение localhost не учитывает все локальные hosts. Убрать production fallback для dev write operations.

### P2-06 — GET-запросы website всегда отправляют JSON Content-Type

Это может создавать лишние CORS preflight. Не добавлять `Content-Type` к GET без body.

### P2-07 — Saved page представлена как готовая функция, но является заглушкой

Либо реализовать минимально полноценное состояние, либо скрыть навигацию/обозначить статус функции.

### P2-08 — Following optimistic delete не проверяет response.ok

При 401/500 UI скрывает элемент до refresh. Нужны rollback и видимая ошибка.

### P2-09 — Установлен, но не настроен `@astrojs/node`

Либо настроить adapter в рамках выбранного SSR-подхода, либо удалить неиспользуемую dependency.

### P2-10 — Дублирующиеся публичные поверхности website/webapp

Разделить ownership: website — публичный SEO-каталог, webapp — authenticated product; убрать дублирующую маршрутизацию и copy drift.

### P2-11 — Canonical JSON сортирует только верхний уровень

Для будущих вложенных payload результат не является стабильной глубокой канонизацией. Применить JCS/RFC 8785 либо строго версионированную схему.

### P2-12 — Transparency log не имеет внешнего anchor

Оператор БД способен переписать историю; `prevEntryHash` недостаточно защищён заявленной моделью. Нужны signed checkpoints/external anchoring либо более точные маркетинговые утверждения.
