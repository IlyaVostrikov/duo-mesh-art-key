# DUO MESH ART KEY — Статус-отчёт для тимлида

**Дата:** 2026-06-06
**Период:** 16 мая – 6 июня 2026 (3 недели)
**Проект:** `D:/AI BASE/DUO MESH ART KEY`

---

## Что такое DUO MESH

Верифицированная экосистема для независимых художников. Каждый художник получает виртуальный 3D-выставочный зал, а каждая работа — цифровой сертификат подлинности Art Key с криптографической цепочкой provenance (SHA-256 + Ed25519). Без блокчейна, без газа, без кошельков.

**Стек:** Bun monorepo — backend (Hono + Prisma + PostgreSQL 18), webapp (React 19 + Vite + TanStack Router + Three.js), website (Astro 6), shared contracts (Zod 4).

---

## Хронология выполненных работ

### Неделя 1 (16–22 мая) — Фундамент и iOS-эксперимент

| Дата | Коммит | Что сделано |
|---|---|---|
| 16.05 | `7e57948` | Базовая установка: шаблон VIBE, деплой-гайды, Prisma + UUIDv7 |
| 16.05 | `f64bc56` | Prisma baseline на strict UUIDv7 + PostgreSQL 18 |
| 19–21.05 | `c3fd61c` → `4c3217b` | iOS IAP paywall MVP (Expo + RevenueCat). Прототип, откачен в ветку. |

**Итог недели:** Исследовали мобильное направление, поняли что сейчас не priority, вернулись к web.

### Неделя 2 (23–30 мая) — Ядро продукта

| Дата | Коммит | Что сделано |
|---|---|---|
| 23–24.05 | `86c4c19`, `3841603` | Документация: mobile branch setup, README архитектура |
| 26.05 | `f016765` | Архитектурная схема в README |
| 27.05 | `a55d762` | Защита деплоя от dirty worktrees |
| 28.05 | `edfba2a`, `0d144a8` | Централизация ошибок валидации, переименование web→webapp, landing→website |
| 30.05 | `90848a8` | **DUO MESH MVP** — арт-маркетплейс: 16 моделей Prisma, artist onboarding, API |
| 30.05 | `0fe8d01` | API-connected страницы, цепочка provenance, онбординг художника |
| 30.05 | `44961a3` | Artwork CRUD с ownership checks, artist-scoped listing |
| 30.05 | `666f5ad` | Dashboard: настройки зала и профиля подключены к API |
| 30.05 | `049dc76` | Seed-пароли (argon2id), CORP cross-origin, ArtKey FK, загрузки, auth flow |
| 30.05 | `a631cac` | **Реальные CC0-визуалы** (23 постера + 6 3D-моделей), лендинг, ArtKey верификация, билингвальный RU/EN |

**Итог недели:** За 2 дня сделан весь core продукта — модели данных, API, авторизация, 3D-залы, онбординг, загрузки, визуалы.

### Неделя 3 (31 мая – 5 июня) — Рефакторинг и визуальный продакшн

| Дата | Коммит | Что сделано |
|---|---|---|
| 31.05 | `ddb0063` | Fix Hall3D: preload текстур/моделей вне R3F Canvas (устранение hooks mismatch) |
| 31.05 | `692bc03` | **Care refactoring** — frontend + backend, устранение дублирования, упрощение |
| 01.06 | `33b170f` | DI для UploadService, устранение prisma bypass в routes, ownership guard, кросс-платформенные шрифты, типизированные DTO |
| 01.06 | `9d89d20` | Извлечение UI-компонентов, устранение inline-стилей, fix Zod 4 типов |
| 02.06 | `d46369f` | **Визуальная идентичность** — типографика (Unbounded), аватарки, логотип, реворк 3D-зала |
| 04.06 | `0bf6bc2` | **Hall3D финал** — музейное освещение, клавиатурная камера, room enclosure, автоскейл 3D-моделей |
| 05.06 | `0cb28e8` | Полный снапшот перед редизайном ArtKey-лендинга (120 файлов, +7876/-814 строк) |

**Итог недели:** Глубокая полировка — архитектурный рефакторинг, визуальная идентичность, финальные настройки 3D-зала.

---

## Что готово на сегодня

### Бэкенд (68 исходных файлов)
- **16 моделей Prisma:** User, Artist, Artwork, ArtKey, ProvenanceRecord, Collector, Collection, Exhibition, ExhibitionHall, Follow, Inquiry, Notification, AuthSession...
- **JWT-аутентификация:** access/refresh токены, argon2id пароли
- **Маршруты:** artists, artworks, halls, admin, search, uploads, featured, social
- **Криптография:** `crypto/` модуль — каноникализация JSON, SHA-256 хеширование, Ed25519 подписи, keystore, timestamp-токены
- **Верификация:** полная цепочка provenance (Layer A: record hashes + Layer B: Ed25519 подписи)
- **Загрузки:** presigned URL, S3-совместимое хранилище (DigitalOcean Spaces)
- **Rate limiting, DI-контейнер, типизированные DTO**

### Webapp (162 файла)
- **3D-выставочный зал:** Three.js / React Three Fiber — стены, пол, потолок, стеклянная дверь, пьедесталы, фреймы с паспарту, музейное двойное освещение на каждую работу, напольные лампы
- **Управление камерой:** клавиатурный dolly/pan, мышиный параллакс, Lenis smooth scroll
- **12 motion-компонентов:** AnimatedCounter, BlurredReveal, CustomCursor, ImageHoverZoom, MagneticButton, SplitText, StaggeredReveal...
- **Dashboard:** управление работами (CRUD), настройки зала (освещение/раскладка), медиа-библиотека, онбординг художника (525 строк)
- **Страницы:** лендинг, галерея, страница художника, страница зала, верификация ArtKey
- **Билингвальность:** RU/EN роутинг
- **Реальные ассеты:** 23 CC0 постера (Met Museum, Wikimedia, Openverse), 8 3D-моделей (Polygonal Mind, Sketchfab CC0)

### Website (Astro, 12 файлов)
- Публичный лендинг, страницы artworks/[id], halls/[slug]

### Shared (packages/)
- `contracts` — 12 Zod 4 схем (artists, artworks, art-keys, halls, auth, social, featured, errors...)
- `verifier` — клиентская верификация сертификатов

### Исследование конкурентов
- Полный competitive intel: Lusion, Noomo, Locomotive, Resn
- Определены обязательные паттерны для DUO MESH (3D-бэкграунд, теги компетенций, Labs, логотипы клиентов)

---

## Ключевые цифры

| Метрика | Значение |
|---|---|
| Коммитов | 30 |
| Файлов изменено | ~597 (+27,959 / -18,922 строк) |
| Моделей БД | 16 |
| API-маршрутов | 8 групп (auth, artists, artworks, halls, admin, search, uploads, social) |
| 2D-постеров | 23 (CC0) |
| 3D-моделей | 8 (CC0) |
| Motion-компонентов | 12 |
| Страниц webapp | 13 |

---

## Текущий фокус

Редизайн ArtKey-лендинга (начат 5 июня, снапшот `0cb28e8`):
- Новые 3D-модели: скелет (Arte Yawi), греческая скульптура (Gregos Bordeaux), москит в янтаре, фигура Наярит
- ArtKey handoff kit (HTML/CSS/JS для экспорта сертификатов)
- Admin dashboard, rate-limiter, обновлённый онбординг

## Бэклог

- **Motion & Interaction (Lusion-style):** Lenis scroll, reveal-on-scroll, кастомный курсор, hover-карточки, анимированные счётчики — спецификация готова
- **Spaces:** не нужны (ассеты локальные через Vite public/)
- **Эквайринг:** отложен на post-MVP

---

## Как запустить

```bash
cd "D:/AI BASE/DUO MESH ART KEY"
docker compose up -d              # PostgreSQL 18 :54329
cd backend && bun run dev         # API :3000
cd webapp && bun run dev          # React :5173
```
