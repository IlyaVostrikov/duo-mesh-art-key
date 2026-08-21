# T19 — Dead-code и устаревшие доки

- **Приоритет:** 5/10
- **Стадия:** Stage 2
- **Область:** backend · website · webapp · docs
- **Статус:** backlog

## Что не так

Мёртвый/заглушечный код и вводящие в заблуждение доки:

- **Webapp:** `/viewer/3d` spike (`routes.tsx:177-198`, зашитые GitHub raw URL) — перенесён сюда из бывшей отдельной задачи.
- **Website:** `_design-v2/` (README + 7 файлов, 0 ссылок), 4 неиспользуемых UI-компонента (`aurora-background`, `label-bar`, `Modal`, `museum-label`), `HeroScrubVideo.tsx` (0 импортов; используется `HeroScrubCanvas`).
- **Backend:** `worker.ts` (no-op «no background handlers»), `cron.ts` (только `noop`+`db:ping`), `crypto/hash.ts` `sha256File` (L11-14, без вызовов), `routes/purchase.ts` (перманентно-отключённый 501 stub), одноразовые скрипты (`diag-locks.mjs`, `apply-pr11-indexes.mjs`, `verify-pr11-schema.mjs`, `fix-collections-lock.mjs`, `fix-hall-covers.mjs`, `concat-migrations.mjs`).
- **INVARIANTS.md** §«Known documentation gaps» устарел: утверждает отсутствие миграций `add_occurred_at` и `add_provenance_unique_constraint`, но они существуют; утверждает, что `migrate-kdf.ts` «сломан под Prisma 7.8», что уже исправлено.

## Почему это важно

Мёртвые entrypoint'ы могут быть ошибочно подключены; устаревшие доки активно вводят в заблуждение (этот ревью замедлился из-за них). Гит-история уже показывает чистку shadcn-остатков — продолжение той же работы.

## Локализация

- `webapp/src/routes.tsx:177-198`, `webapp/src/_design-v2/`, `webapp/src/components/ui/*`.
- `website/src/components/HeroScrubVideo.tsx`.
- `backend/src/worker.ts`, `cron.ts`, `crypto/hash.ts`, `routes/purchase.ts`, `scripts/*.mjs`.
- `INVARIANTS.md`.

## Минимальная правка

1. Удалить spike-роут и мёртвые компоненты/дерево `_design-v2`.
2. Удалить (или явно пометить) заглушки `worker.ts`/`purchase.ts`, `sha256File`; архивировать одноразовые скрипты.
3. Обновить `INVARIANTS.md` (убрать устаревшие «missing migrations», поправить утверждение про migrate-kdf).

## Подводные камни

- **`/viewer/3d` — dev-spike, безопасен для удаления**, но проверить, не зашит ли роут где-то ещё (grep `viewer/3d`).
- **Одноразовые скрипты** могут быть ещё нужны для разовых операций — архивировать в `scripts/archive/` или `./.scratch/`, не удалять без проверки с пользователем.
- **Не трогать `INVARIANTS.md`-секции**, которые ещё актуальны (KDF deviation — отдельный трек).
- Удаление компонентов UI — проверить `git grep` на импорты перед удалением.

## Приёмочные критерии

1. `git grep "viewer/3d"` пусто (или только в истории).
2. `_design-v2/` и 4 мёртвых UI-компонента удалены, `bun run --cwd webapp build` зелёный.
3. `INVARIANTS.md` больше не утверждает отсутствующие миграции.

## Валидация

```bash
bun run --cwd webapp build
bun run --cwd website build
bun run --cwd backend typecheck
```

## Связанные задачи

- T13 (сайт dead-code)
- T11 (устаревшие доки mobile)
