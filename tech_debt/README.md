# Tech-debt — задачи

Ультра-глубокий ревью кодовой базы (backend / webapp / website / mobile / packages). ~60 находок сведены в 22 задачи, отсортированы по приоритету. Каждая — отдельный файл `<NN>-<slug>.md` с полями: что/почему/локализация/минимальная правка/подводные камни/приёмочные критерии.

Исполнение — отдельной сессией через `/goal`, по одной: реализация → контекстно-свободный sub-агент на код-ревью (1–10) → выравнивание → commit/push → следующая.

## Stage 1 — делать сейчас

| # | Приоритет | Задача |
|---|-----------|--------|
| T01 | 10 | [Корень доверия: убрать закоммиченный приватный ключ платформы](T01-platform-root-keypair.md) |
| T02 | 10 | [Stored XSS на маркетинговом сайте](T02-website-stored-xss.md) |
| T03 | 9 | [`EditArtworkForm` удаляет EN-половину полей](T03-edit-form-bilingual-truncation.md) |
| T04 | 8 | [Офлайн-верификатор: integrityHash + null-pubkey + platformSignature](T04-verifier-correctness.md) |
| T05 | 8 | [Fail-fast на старте + убрать runtime-DDL и автопереотзыв](T05-startup-fail-fast-and-key-loss.md) |
| T06 | 8 | [Портабельность Node/Vercel + KDF-роут](T06-node-vercel-portability.md) |
| T07 | 8 | [`handleError` отдаёт стектрейс](T07-error-stack-leak.md) |
| T08 | 7 | [Тест-инфраструктура: glob + раскип](T08-test-infra-glob-and-unskip.md) |
| T09 | 7 | [Дифференциальный тест canonical ↔ verifier](T09-canonical-differential-test.md) |
| T10 | 7 | [Починить verification schema + валидация](T10-verification-schema.md) |

## Stage 2 — обсудить перед внедрением

| # | Приоритет | Задача |
|---|-----------|--------|
| T11 | 9 | [Восстановление mobile + дрейф имён пакетов (продуктовое решение)](T11-mobile-restoration.md) |
| T12 | 7 | [Выравнивание конвенций генезиса](T12-genesis-convention-alignment.md) |
| T13 | 7 | [Сайт: один API-клиент + честный getStaticPaths](T13-website-api-client-ssg.md) |
| T14 | 6 | [Внедрение TanStack Query + консолидация fetch](T14-tanstack-query-adoption.md) |
| T15 | 6 | [Дедупликация Create/Edit форм + upload hook](T15-artwork-form-dedupe.md) |
| T16 | 6 | [Причёсывание типов contracts](T16-contracts-typing.md) |
| T17 | 7 | [Расширение покрытия тестами](T17-test-coverage-expansion.md) |
| T18 | 5 | [Декомпозиция god-модуля app.ts](T18-app-ts-decomposition.md) |
| T19 | 5 | [Dead-code и устаревшие доки](T19-dead-code-and-stale-docs.md) |
| T20 | 6 | [Безопасность конфигурации](T20-security-config-hardening.md) |
| T21 | 5 | [Обход дизайн-системы + UX](T21-design-system-ux-cleanup.md) |
| T22 | 5 | [Декомпозиция god-components](T22-god-component-decomposition.md) |

## Вне этого списка

KDF-миграция SHA-256→PBKDF2 (прод-баг `POST /artworks 500`, задокументирован в `INVARIANTS.md` §8) — отдельный трек, передан другому агенту; здесь не дублируется. Задачи T05/T06 касаются её по касательной.
