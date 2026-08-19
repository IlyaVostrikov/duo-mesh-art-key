# Готовое задание для агента

Скопируй текст ниже в новую задачу агента.

---

Ты работаешь в репозитории DUO MESH ART KEY как staff-level product engineer.

Сначала полностью прочитай:

- `AGENTS.md`;
- `Help ai agents/CODE_AUDIT_2026-08-01/00_README.md`;
- `Help ai agents/CODE_AUDIT_2026-08-01/02_FINDINGS.md`;
- `Help ai agents/CODE_AUDIT_2026-08-01/03_REMEDIATION_PLAN.md`;
- `Help ai agents/CODE_AUDIT_2026-08-01/04_VALIDATION_CHECKLIST.md`.

Перед изменениями:

1. Покажи текущий commit и dirty worktree.
2. Сравни текущий код с audit snapshot `0942aa22e7cb13f2bc5b3e34a39f487d5d2a953e`.
3. Повторно подтверди выбранные finding IDs по текущему коду.
4. Определи 3–5 наблюдаемых критериев приёмки и основной runtime-сигнал.
5. Составь минимальный план одного связного этапа. Не пытайся закрыть весь аудит одним diff.

Начни с containment и P0. Рекомендуемая первая задача: read-only проверить P0-03/P0-04, затем безопасно закрыть P0-10/P0-12/P0-13 без production-операций. Если для исправления нужны продуктовый выбор, production secrets, key rotation, data migration, новая dependency, deployment или destructive action — остановись и запроси решение владельца.

Для поведения, контрактов, permissions, persistence и concurrency работай TDD-first. Исправляй owning layer, проверяй вертикальный путь и соседние потребители. Не ослабляй auth/validation. Не пиши Prisma migration SQL вручную. Не изменяй generated files напрямую. Не трогай посторонние изменения.

После завершения:

- перечисли закрытые IDs;
- объясни root cause и product impact;
- укажи точные проверки и результаты;
- сообщи primary и secondary signal status;
- перечисли оставшиеся риски и следующий рекомендуемый этап;
- обнови `06_TASKS.csv` только для действительно подтверждённых/закрытых задач.

---

## Вариант для одного конкретного этапа

Добавь к промпту:

`В этой задаче работай только с ID: <СПИСОК_ID>. Остальные findings используй только как контекст зависимостей и не исправляй без необходимости.`
