# DUO MESH ART KEY — Задачи по итогам полного код-ревью (2026-08-02)

**Источник:** независимый код-ревью всей кодовой базы (services, routes, auth/crypto) тремя саб-агентами.
**Приоритет:** P0 = критично (безопасность/корректность), P1 = важно (надёжность), P2 = желательно (полировка).

---

## P0 — Критические

### P0-01: ArtKey genesis — неатомарная запись
**Файл:** `backend/src/services/art-key.service.ts:90-134`
**Суть:** Три sequential `await this.prisma.*.create()` (ArtKey → ProvenanceRecord → TransparencyLog) без `$transaction`. При падении между шагами: ArtKey без provenance-цепочки, или без transparency-log.
**Аудит:** P1-01 (заявлен как исправленный, но в коде транзакции нет).
**Оценка:** Service reviewer 5/10

### ~~P0-02: Обход авторизации — любой пользователь видит непубличные artwork'и~~ ✅ (795f62f)
**Файл:** `backend/src/services/artwork.service.ts:71-75`
**Суть:** При передаче `artistId` фильтр публичной видимости отключается (`else if (!artistId)`). Нет проверки, что запрашивающий = владелец. DRAFT/SOLD/ARCHIVED artwork'ы утекают любому.
**Исправлено:** viewerUserId/viewerRole прокинуты через route→service, ownership check через artist.userId, публичный фильтр применяется когда нет bypass.

### ~~P0-03: Отсутствие авторизации на мутациях artwork~~ ✅ (444d791)
**Файл:** `backend/src/services/artwork.service.ts:197-216`
**Суть:** `update()`, `updateImages()`, `delete()` принимают `artworkId` без проверки владельца. Любой аутентифицированный пользователь может изменить/удалить любой artwork.
**Исправлено:** verifyOwnership() в сервисе, route-проверки удалены (DRY), lookupById удалён.

### ~~P0-04: Понижение ADMIN → ARTIST при онбординге~~ ✅ (14ef194)
**Файл:** `backend/src/services/artist.service.ts:98`
**Суть:** `const userUpdate = { role: UserRole.ARTIST }` — безусловно перезаписывает роль. Если ADMIN создаёт профиль художника, его роль молча понижается.
**Исправлено:** guard: только GUEST/COLLECTOR → ARTIST, ADMIN и существующий ARTIST сохраняются.

### ~~P0-05: ZIP bomb — OOM до проверки размера~~ ✅ (fe53f5f)
**Файл:** `backend/src/services/upload.service.ts:152`
**Суть:** `unzipSync(buffer)` декомпрессирует ВЕСЬ архив в память ДО проверок. 50 KB ZIP → 5 GB = OOM.
**Исправлено:** readZipMetadata() читает central directory без декомпрессии, все проверки ДО unzipSync.

### ~~P0-06: verifyTimestampToken всегда возвращает valid:true~~ ✅ (de83302)
**Файл:** `backend/src/crypto/timestamp.ts:66-84`
**Суть:** Оба параметра с префиксом `_` (неиспользуемые). Возвращает `{ valid: true, timestamp: null }` для любого входа. Для provenance-платформы, где timestamp — единственное независимое темпоральное доказательство, это критический пробел.
**Оценка:** Auth/crypto reviewer 6/10

### ~~P0-07: Самоназначаемые роли при регистрации~~ ✅ (ff26d42)
**Файлы:** `packages/contracts/src/auth.ts:31`, `backend/src/auth/service.ts:54`
**Суть:** Zod schema позволяет `role: 'ARTIST' | 'COLLECTOR'` при регистрации, и сервис напрямую использует `input.role`. Атакующий может зарегистрироваться как ARTIST и создавать provenance-записи.
**Исправлено:** role удалён из registerRequestSchema, auth.service жёстко ставит GUEST, frontend больше не передаёт role в API.

### ~~P0-08: Несогласованный формат ошибок API~~ ✅ (cde596d)
**Файлы:** `backend/src/http/errors.ts:18-28`, все routes
**Суть:** `errorResponse()` выдаёт `{ error: { code, message } }` (вложенный объект). Все хендлеры (кроме `transfers.ts`) выдают `{ error: "CODE", message: "..." }` (плоский). Один endpoint может вернуть ОБА формата в зависимости от того, где произошла ошибка (middleware vs handler).
**Исправлено:** Все 11 route файлов используют errorResponse(), формат единый { error: { code, message } }, коды ошибок в сервисах приведены к ApiErrorCode.

### ~~P0-09: Seed endpoint — нет rate limiting, токен в query string~~ ✅ (2ccc654)
**Файл:** `backend/src/routes/seed.ts:14-22`
**Суть:** Нет `rateLimiter()` на `/seed-db`. Токен можно передать через `?token=` (логируется в proxy/access-логах). Простое строковое сравнение без `timingSafeEqual`.
**Исправлено:** Только x-seed-token header, SHA-256 + timingSafeEqual, rateLimiter(3/мин), константный код-путь.

### ~~P0-10: Key rotation оставляет художника без активного ключа при ошибке~~ ✅ (8d4c0d0)
**Файл:** `backend/src/services/signing.service.ts:114-141`
**Суть:** `generateArtistKeyPair()` деактивирует старый ключ (`updateMany` на строке ~115) ДО создания нового. При ошибке генерации — ноль активных signing keys.
**Исправлено:** Сначала создаётся новый ключ, потом деактивируются старые. Добавлен `id: { not: key.id }` guard.

---

## P1 — Важные

### ~~P1-01: Нет авторизации на Hall create/update~~ ✅ (2c608e2)
**Файл:** `backend/src/services/hall.service.ts:39-80`

### ~~P1-02: Platform key невосстановим после cold start~~ ✅ (fa9d8c1)
**Файл:** `backend/src/services/signing.service.ts:58-71`

### ~~P1-03: ProvenanceTransferService.createTransfer без tx неатомарен~~ ✅ (8b77280)
**Файл:** `backend/src/services/provenance-transfer.service.ts:32-63`

### ~~P1-04: Нет авторизации на ArtistService.update()~~ ✅ (1ab0449)
**Файл:** `backend/src/services/artist.service.ts:123-151`

### ~~P1-05: Certificate PDF fetch без таймаута~~ ✅ (42524b5)
**Файл:** `backend/src/services/certificate-pdf.ts:252`

### ~~P1-06: Hardcoded featured-маппинги~~ ✅ (2567cba)
**Файл:** `backend/src/services/featured.service.ts:8-25, 56-61`

### P1-07: Нет пагинации в sale.service.ts
**Файл:** `backend/src/services/sale.service.ts:6-46, 49-76`

### P1-08: Keystore concurrency race
**Файл:** `backend/src/crypto/keystore.ts:43-72`

### P1-09: Transfer error handler: `as 200` type assertion
**Файл:** `backend/src/routes/transfers.ts:153`

### P1-10: Inquiry на непубличные artwork'ы
**Файл:** `backend/src/routes/inquiries.ts:28-31`

### P1-11: Hall view count роняет весь запрос при ошибке
**Файл:** `backend/src/routes/halls.ts:25-31`

### P1-12: SHA-256 как одноразовый KDF для keystore
**Файл:** `backend/src/crypto/keystore.ts:29-31`

### P1-13: extractGenTime молча возвращает new Date() при ошибке
**Файл:** `backend/src/crypto/timestamp.ts:151-179`

### P1-14: Утечка email через timing side-channel при логине
**Файл:** `backend/src/auth/service.ts:68-83`

---

## P2 — Желательно

### P2-01: Неверный комментарий о размере приватного ключа
**Файл:** `backend/src/crypto/keys.ts:5-6`

### P2-02: Keystore file race на concurrent writes
**Файл:** `backend/src/crypto/keystore.ts:43-73` (низкий практический риск из-за однопоточности JS)

### P2-03: Опечатка в имени переменной `provenanceTransferSvc`
**Файл:** `backend/src/routes/transfers.ts:43`

---

## Статистика

| Приоритет | Всего |
|-----------|-------|
| P0 | 10 |
| P1 | 14 |
| P2 | 3 |
| **Итого** | **27** |

## Процесс

Каждая задача обрабатывается по циклу:
1. **SOL-анализ** — саб-агент описывает pitfalls, edge-cases, проблемные места
2. **Реализация** — внесение исправлений
3. **Код-ревью** — loop-code-review: независимый ревьюер, итерации до 9.5/10 или "no actionable findings"
4. **Commit** — атомарный git commit с описанием
5. **Mark complete** — отметить задачу выполненной в этом файле
6. **Next** — переход к следующей незакрытой задаче

Начало: P0-01 (ArtKey genesis atomicity).
