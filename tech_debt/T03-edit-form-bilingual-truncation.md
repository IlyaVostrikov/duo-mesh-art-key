# T03 — `EditArtworkForm` молча удаляет EN-половину билингвальных полей

- **Приоритет:** 9/10
- **Стадия:** Stage 1
- **Область:** webapp
- **Статус:** backlog

## Что не так

`webapp/src/components/artwork/EditArtworkForm.tsx`:

- при загрузке читает только RU-префикс title через `data.title.indexOf(' / ')` (L73-74);
- description грузится «как есть» без разделения половин;
- при сохранении пишет обратно `title.trim()` и `description.trim() || undefined` (L125-126).

Итог: на каждом редактировании **EN-половина title и EN-половина description уничтожаются** (остаётся только RU).

## Почему это важно

Безвозвратная потеря данных для каждого двуязычного арт-объекта при любом редактировании. Это не косметика — это дата-лосс.

## Локализация

- `webapp/src/components/artwork/EditArtworkForm.tsx:73-74` — парсинг RU-префикса title.
- `webapp/src/components/artwork/EditArtworkForm.tsx:125-126` — сохранение без обратной сборки.
- `webapp/src/lib/utils.ts` — уже есть `parseBilingual`, `parseBilingualTitle`, `joinBilingual`, `joinBilingualTitle` (правильные round-trip хелперы).
- `webapp/src/components/artwork/CreateArtworkForm.tsx:73-76` — эталонный паттерн использования.

## Минимальная правка

1. Разделить title на RU/EN поля при инициализации через `parseBilingualTitle`.
2. Разделить description через `parseBilingual`.
3. При сохранении собрать обратно через `joinBilingualTitle` / `joinBilingual`.

## Подводные камни

- **Разделители разные:** title — `' / '`, description — `\n\n---\n\n`. Не использовать один разделитель для обоих; хелперы это уже учитывают.
- **Одна из половин может отсутствовать** (только RU или только EN) — `joinBilingual*` должен корректно вернуть единственную половину без «пустого разделителя».
- **Не дублировать логику разбора инлайн** — импортировать из `lib/utils.ts`, а не копировать `indexOf`.
- Сверить с `CreateArtworkForm`, чтобы поведение create/edit совпадало.

## Приёмочные критерии

1. Арт-объект с title `"Заголовок / Title"` и description `"RU\n\n---\n\nEN"` после сохранения сохраняет обе половины.
2. Юнит-тест на `parseBilingual*/joinBilingual*` round-trip (RU, EN, смешанный, отсутствующая половина) зелёный.
3. `bun run --cwd webapp build` проходит.

## Валидация

```bash
bun run --cwd webapp test
bun run --cwd webapp build
# ручная проверка: открыть существующий двуязычный арт-объект, сохранить, убедиться EN не пропал
```

## Связанные задачи

- T15 (дедупликация Create/Edit форм)
- T17 (покрытие тестами utils)
