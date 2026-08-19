# DUO MESH ART KEY — E2E-аудит залогиненной зоны + план исправлений

**Дата:** 2026-08-18
**Область:** зона после входа (художник `elena.volkova@duomesh.art` / коллекционер `collector1@duomesh.art`, пароль `password123`)
**Вывод:** сайт сырой. Один критический блокер (создание artwork = 500 + падение бэкенда) и ряд высоких/средних багов. На продакшен ставить нельзя до P0/P1.

---

## Часть 1. Ошибки и незакрытые вопросы

### P0 — Критический блокер

#### 1. Создание artwork → 500 + падение процесса (корень: незавершённая миграция KDF)
**Симптом:** `POST /api/artworks` возвращает
`{"error":{"code":"INTERNAL_ERROR","message":"The operation failed for an operation-specific reason","details":""}}`
и роняет бэкенд (exit 1).

**Корневая причина.** Миграция P1-12 (SHA-256 → PBKDF2 для keystore) заявлена в `tasks.md` как «✅ (pending commit)», но **по данным не доведена**:
- `backend/data/keystore.json` (mtime 7 июня) всё ещё зашифрован **старым** SHA-256 KDF.
- `keystore.ts` теперь деривит ключ через **PBKDF2** + соль из `keystore.salt` (mtime 2 августа — файл «осиротел», не связан с keystore.json).
- `KeyStore.get()` → `crypto.subtle.decrypt` (AES-GCM) падает с `OperationError`, потому что ключ деривирован неверно.
- Ошибка пробрасывается из `signing.service.ts` (`signProvRecord`, строки 201–217) при подписи platform-ключа в `art-key.service.ts` (строка ~73) → 500 + краш.

**Ключевой факт (утешительный):** активный PLATFORM-ключ `019e9ce8` дешифруется **только старым** KDF, длина открытого текста 96 символов = pkcs8 hex. То есть **приватный ключ восстановим** — нужно лишь корректно пере-зашифровать его под PBKDF2 (или временно поддержать старый KDF для чтения при миграции).

**Почему не сработал скрипт миграции:** `backend/scripts/migrate-kdf.ts` сломан под Prisma 7 (см. P1-2) и, вероятно, вообще не запускался.

---

### P1 — Высокие

#### 2. Устаревшие enum-константы в `artwork.service.ts` ломают фильтры галереи
**Файл:** `backend/src/services/artwork.service.ts:11-15`
**Суть:** валидация фильтров в `list()` использует константы, не совпадающие с реальной схемой Prisma и контрактами.

| Константа в коде | Реальное значение (Prisma `schema.prisma`) | Следствие |
|---|---|---|
| `VALID_CATEGORIES = ['DIGITAL','PHYSICAL','HYBRID']` | `PAINTING, DIGITAL, PHOTOGRAPHY, SCULPTURE, MIXED_MEDIA, NFT, PRINT, DRAWING, OTHER` | `?category=PAINTING` → 400 |
| `VALID_MEDIA_TYPES = ['IMAGE','VIDEO','3D_MODEL','AUDIO']` | `IMAGE_2D, MODEL_3D` | `?mediaType=IMAGE_2D` → 400 |
| `VALID_STATUSES` (без `RESERVED`) | `DRAFT, LISTED, IN_EXHIBITION, SOLD, RESERVED, ARCHIVED` | `?status=RESERVED` → 400 |

**Итог:** UI галереи, передающий реальные значения (`PAINTING`, `IMAGE_2D`…), получает `400 Invalid filter`. Фильтрация по категории/типу/статусу не работает. `create()` при этом НЕ задет (передаёт значения напрямую в Prisma) — баг только в фильтрах `list()`.

#### 3. `migrate-kdf.ts` сломан под Prisma 7.8
**Файл:** `backend/scripts/migrate-kdf.ts:171`
**Суть:** `new PrismaClient()` без adapter. В Prisma 7 обязателен `@prisma/adapter-pg` (как в `src/db.ts` через `createPrisma()`). Плюс скрипт генерирует новую случайную соль при каждом запуске → неидемпотентен.

#### 4. Дрейф данных: `owner_type='REGISTRY'` отсутствует в enum Prisma
**Файл:** `schema.prisma` (`SigningKeyOwnerType`), таблица `signing_keys`
**Суть:** в БД есть строка с `owner_type='REGISTRY'`, которой нет в Prisma-энуме. Любой типизированный `signing_keys.findMany()` падает с `P2023`. Нужно либо добавить `REGISTRY` в enum, либо мигрировать/удалить строку.

#### 5. Нет ни одной ARTIST-подписи → provenance-цепочка неполная
**Файл:** `signing.service.ts` (`generateArtistKeyPair`), `artist.service.ts:110-112`
**Суть:** `signing_keys` содержит только PLATFORM (active, `encrypted_private_key` = NULL — ключ живёт лишь в keystore.json) и REGISTRY (inactive). При онбординге художника `generateArtistKeyPair` должен создавать ключ, но в БД их нет (вероятно, онбординг завершался до появления этого кода, либо падал на записи). Следствие: genesis artwork **молча пропускает** подпись художника — сертификат подписан только платформой.

---

### P2 — Средние

#### 6. `seed-db.ts` хэширует пароли несовместимо с продакшеном
**Файл:** `backend/src/admin/seed-db.ts`
**Суть:** использует `crypto.scryptSync` с префиксом `$2b$10$` (bcrypt), тогда как прод использует argon2id. Сиды через этот скрипт дают нерабочие логины. Корректный вариант — `backend/prisma/seed.ts` (argon2id).

#### 7. Фича «Сохранённое» — статическая заглушка
**Файл:** `webapp/src/pages/collection/SavedPage.tsx`
**Суть:** страница рисует только «пусто». Нет ни кнопки «сохранить», ни бэкенд-роута `/collection`. `CollectionPage` при этом показывает покупки (`/api/sales/me`), а не сохранённое. Требуется продуктовое решение (см. вопрос Q1).

#### 8. Дрейф миграций
**Суть:** папка миграций содержит stale `add_session_family_id` (откачена), но отсутствуют `add_occurred_at` и `add_provenance_unique_constraint`. Часть схемы, возможно, применена вручную (`prisma db push`) — нужно выровнять.

---

### P3 — Полировка

#### 9. Часть dashboard-страниц не использует ApiClient (нет авто-refresh токена)
**Файлы:** `DashboardSales.tsx`, `DashboardKeys.tsx`, `DashboardHallSettings.tsx`, `FollowingPage.tsx`
**Суть:** используют сырой `fetch` с ручным `Authorization: Bearer`. В отличие от `ApiClient` (401 → `refreshOnce()` → повтор), при истечении access-токена эти страницы падают с `HTTP 401` вместо прозрачного обновления сессии.

---

### Незакрытые вопросы (требуют решения владельца)

- **Q1 (продукт):** что такое «Сохранённое / Saved»? Отдельная фича (нужен бэкенд `collection` + кнопка save) или это должна быть страница покупок коллекционера? Сейчас `SavedPage` пуста, а покупки живут в `CollectionPage`.
- **Q2 (продукт/схема):** статус `RESERVED` присутствует в enum Prisma, но отсутствует в `CreateArtworkForm` (только `LISTED`/`DRAFT`). Используется ли резерв где-то, или это мёртвый статус?
- **Q3 (инфра):** `SECRET_STORE_KEY` — дефолтный плейсхолдер из `env.ts`, не переопределён в `.env`. Если в проде keystore зашифрован дефолтным dev-ключом — это критическая утечка. Какой секрет настроен в продакшене?
- **Q4 (концепция):** что такое `owner_type='REGISTRY'`? Была ли концепция «реестра», от которой отказались? Нужно решить — добавить в enum или удалить строку.
- **Q5 (статус миграции):** запускался ли PBKDF2-скрипт хоть в одном окружении (dev/prod), или код везде «впереди данных»? От ответа зависит, безопасно ли просто перегенерировать platform-ключ вместо миграции.

---

## Часть 2. Детальный план исправлений

Порядок — по приоритету. P0 блокирует всё остальное, поэтому начинаем с него.

### Этап A — Разблокировать создание artwork (P0)

1. **Починить `migrate-kdf.ts`** (`backend/scripts/migrate-kdf.ts:171`):
   - заменить `new PrismaClient()` на `createPrisma(process.env.DATABASE_URL!)` из `src/db.ts`;
   - сделать соль **детерминированной** (сохранять/переиспользовать существующую из `keystore.salt`, а не генерировать новую каждый запуск);
   - добавить поддержку resume (не падать на уже смигрированных ключах).
2. **Реализовать в самом скрипте (или отдельном одноразовом) чтение старым KDF:** для каждого ключа попробовать расшифровать старым SHA-256, затем пере-зашифровать PBKDF2 и записать `encrypted_private_key` в БД. Это «мостик» для ключа `019e9ce8`.
3. **Прогнать миграцию** сначала `--dry-run`, затем по-настоящему. Проверить, что `KeyStore.get('019e9ce8')` возвращает 96-hex pkcs8.
4. **Перезапустить бэкенд**, прогнать smoke: `POST /api/artworks` с минимальным валидным payload → ожидать 201 + `artKey.keyCode`.
5. Проверить `GET /api/art-keys/:keyCode` и `GET .../certificate.pdf`.

**Критерий готовности этапа A:** создание artwork проходит e2e без краша, генерируется ArtKey.

### Этап B — Починить фильтры галереи (P1-2)

6. В `artwork.service.ts:11-15` заменить `VALID_CATEGORIES`, `VALID_MEDIA_TYPES`, `VALID_STATUSES` на фактические значения Prisma-энумов (лучше — импортировать из одного источника: сгенерированных Prisma-типов или `packages/contracts`), добавить `RESERVED`.
7. Проверить фильтры: `?category=PAINTING`, `?mediaType=IMAGE_2D`, `?status=RESERVED` → 200 (не 400).

### Этап C — Дрейф данных и artist-ключи (P1-4, P1-5) ✅ ВЫПОЛНЕН

8. ✅ **Q4 решён → REGISTRY удалён** (мёртвая концепция, а не добавление мёртвого enum-значения). Строка `019ea14b…` — legacy EC-PEM-ключ (не Ed25519), `owner_id=NULL`, `encrypted_private_key=NULL`, 0 FK-ссылок, 0 обращений в коде. Бэкап: `.scratch/signing_keys-backup.sql`. Осиротевшие `registry_key_id` (колонка) и `DUO_MESH_REGISTRY_*` (.env) отложены в этап E.
9. ✅ **Backfill artist-ключей:** `backend/scripts/backfill-artist-keys.ts` → 9 художникам созданы ключи (active, 64-hex pub, enc-priv заполнен).
10. ✅ **Genesis больше не молчит:** `art-key.service.ts` генерирует ключ художника на лету (`generateArtistKeyPair`) если активного нет. Smoke: genesis `signer_role='ARTIST'` + `platform_signature`, `verified=True`.

### Этап D — Сиды и фича «Сохранённое» (P2) ✅ ВЫПОЛНЕН

11. ✅ Починен `seed-db.ts`: `scryptSync`/`$2b$10$` заменён на argon2id (`Bun.password.hash`), выровнен с `prisma/seed.ts`.
12. ✅ Q1 решён → «Сохранённое» = отдельная фича закладок (ответ владельца: «Закладки (новое)»). Реализовано на существующих таблицах `Collection` + `CollectionArtwork` (без миграций, коллекция `title='Saved'`, `isPublic=false`):
   - `packages/contracts/src/collection.ts` — `saveArtworkResponseSchema`, `savedArtworkListSchema`.
   - `backend/src/services/collection.service.ts` — `CollectionService`: save/unsave (идемпотентно, `saveCount` инкремент/декремент), `listSaved`, `getSaveStatus`; ленивое создание профиля коллекционера (`collector.upsert`) если роли COLLECTOR/ADMIN нет профиля.
   - `backend/src/routes/collection.ts` — `GET /collection`, `GET/POST/DELETE /collection/:artworkId` (authGuard; save/unsave — `requireRole('COLLECTOR','ADMIN')`). Смонтирован в `app.ts`.
   - `webapp/src/components/SaveButton.tsx` — кнопка-закладка (по образцу FollowButton, авто-загрузка статуса).
   - `webapp/src/pages/collection/SavedPage.tsx` — переписан: фетч `/api/collection`, грид карточек, удаление.
   - `webapp/src/pages/gallery/GalleryPage.tsx` — SaveButton вставлен поверх карточек (вне `<Link>`).
   - **Smoke (проверено curl):** сохранить → `saveCount` 0→1, повторный save идемпотентен (осталось 1), `GET /collection` total=1, удалить → total=0; художник POST → 403, GET статуса → 200.

### Этап E — Миграции и полировка (P2/P3)

13. ✅ Выровнена папка миграций: `add_occurred_at` (тип `TIMESTAMP(3)` + `SET DEFAULT NOW()`, checksum выправлен в `_prisma_migrations`), `add_signing_key_encrypted_private_key` (baseline через `migrate resolve --applied`), `add_provenance_unique_constraint` (сгенерён `migrate diff` + применён `migrate deploy`). Регистри-дрейф вычищен через psql. Итог: `migrate status` = up to date, `migrate diff` = empty (дрейфа нет).
14. ✅ Dashboard-страницы (Sales/Keys/HallSettings/Following) переведены на `ApiClient.requestJson` (401 → `refreshOnce()` → повтор). Дополнительно (консистентность) переведены `SaveButton` и `SavedPage` из Этапа D. `ApiClient` теперь экспонируется через `AuthContext.api`; в `api.ts` добавлены `requestJson<T>` + `PATCH/DELETE`. `tsc -b` — чисто.
15. ✅ Q3 решён. Код уже валидировал сильный секрет в проде (`validateSecretStoreKey`, из P0-04), но данные были зашифрованы dev-плейсхолдером. Решение владельца: «сгенерировать новый + ротация». Сделан `backend/scripts/rotate-secret.ts` (PBKDF2 old→new, keystore + DB, с бэкапами `*.pre-rotate.bak`). Прогнано `--generate`: новый 64-символьный секрет записан в `backend/.env`, 21 keystore-запись + 9 DB-строк перешифрованы, 26 осиротевших пропущены (неизвестный секрет). Бэкенд перезапущен, `/api/health` 200, smoke `POST /api/artworks` → 201. **Для прода:** тот же ротейт прогнать на проде с отдельным секретом (не переиспользовать dev-ключ).

---

## Итоговая оценка готовности к продакшену

| Блок | Статус |
|---|---|
| Логин / сессия / роли | ✅ работает |
| Публичный бrowse (artworks/artists/halls/search/featured) | ✅ работает (кроме фильтров — P1-2) |
| Создание artwork (ядро ArtKey) | ❌ P0 блокер |
| Фильтры галереи | ❌ P1-2 |
| Провенанс (artist-подпись) | ⚠️ неполный (P1-5) |
| Сохранённое / коллекция | ❌ заглушка (P2-7) |
| Сиды | ❌ несовместимы (P2-6) |

**Вердикт:** до закрытия Этапов A–C продакшен недоступен. Этапы D–E — обязательны до «полированного» релиза, но не блокируют техническую готовность ядра.
