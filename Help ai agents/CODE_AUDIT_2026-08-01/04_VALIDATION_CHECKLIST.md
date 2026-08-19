# Проверочный чек-лист

Агент должен сначала прочитать актуальные scripts в `package.json`, `backend/package.json`, `webapp/package.json`, `website/package.json` и `packages/verifier/package.json`. Не следует придумывать новые команды, если в репозитории уже есть штатные.

## Подготовка

- [ ] Зафиксирован текущий `git rev-parse HEAD`.
- [ ] Проверен `git status --short --branch`; посторонние изменения не затронуты.
- [ ] Прочитаны `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/LOCAL_DATABASE.md`, `docker-compose.yml`.
- [ ] Используется локальная test database, production URL/credentials исключены.

## ArtKey и provenance

- [ ] Новая genesis-запись проходит online verification.
- [ ] Новый transfer проходит online verification.
- [ ] Export проходит `packages/verifier` без изменения JSON.
- [ ] Изменение одного подписанного поля делает результат invalid.
- [ ] Отсутствующая обязательная подпись не считается valid.
- [ ] Неизвестная payload version возвращает unsupported/indeterminate, а не valid.
- [ ] Запись, подписанная старым ключом, проверяется после rotation.
- [ ] Две конкурентные передачи: одна success, вторая conflict.
- [ ] Sequence уникален и непрерывен.
- [ ] Transaction rollback не оставляет ArtKey без genesis или owner без provenance.

## Key management

- [ ] Production не стартует без сильного `SECRET_STORE_KEY`.
- [ ] Placeholder и тестовые секреты явно отклоняются.
- [ ] В репозитории нет production private root key.
- [ ] Test key генерируется изолированно.
- [ ] Rotation/backward verification документированы.

## Storage и upload

- [ ] Клиентский неверный checksum отклоняется finalize endpoint.
- [ ] Подмена bytes после issuance обнаруживается verification.
- [ ] Пользователь B не скачивает private object пользователя A.
- [ ] Пользователь B не удаляет object пользователя A.
- [ ] Public object доступен только при public visibility.
- [ ] Разрешённый asset доступен после serverless cold start.
- [ ] 3D-файлы на границах лимита дают документированные результаты.
- [ ] ZIP с превышением entries/total size/ratio отклоняется до чрезмерного потребления памяти.
- [ ] Частично распакованный ошибочный ZIP не оставляет файлов.
- [ ] Cleanup не удаляет referenced object.

## Purchase и ownership

- [ ] Client POST не создаёт COMPLETED sale без trusted payment event.
- [ ] Повторный webhook/request идемпотентен.
- [ ] DRAFT, ARCHIVED, SOLD и неподходящие состояния купить нельзя.
- [ ] Self-purchase запрещён.
- [ ] Currency/amount соответствуют listing и не берутся из произвольного client input.
- [ ] Failed/expired payment не меняет owner.
- [ ] Issued/sold artwork невозможно физически удалить.

## Website

- [ ] `/artworks/<real-id>` открывается напрямую и после refresh.
- [ ] `/artists/<real-id>` открывается напрямую и после refresh.
- [ ] `/halls/<real-slug>` работает с 0, 1 и несколькими artworks.
- [ ] `/verify` корректно показывает valid/invalid/not-found/server-error.
- [ ] `<img src=x onerror=...>` в title/name/bio/description/tag показывается текстом и не исполняется.
- [ ] Главный контент публичной страницы присутствует в server HTML.
- [ ] CTA регистрации ведёт на реальный production-configured route.
- [ ] GET не вызывает ненужный JSON preflight.

## Auth, routing и API

- [ ] Rate limiter действительно применяется к итоговым `/api/auth/*` URLs.
- [ ] Transparency endpoints имеют один согласованный prefix.
- [ ] Revoked session не проходит выбранную security policy.
- [ ] Public inquiry ограничен rate limit/abuse protection.
- [ ] Invalid category/status/media enum возвращает 400.
- [ ] DRAFT/ARCHIVED artwork и unpublished hall скрыты от постороннего пользователя.
- [ ] Owner/admin имеет только документированные исключения видимости.
- [ ] Update/delete lookup не увеличивает view count.

## CI и сборка

- [ ] CI запускается на default branch и pull requests.
- [ ] Backend tests реально await async app creation.
- [ ] Webapp E2E соответствует текущему `/login` flow.
- [ ] Verifier tests входят в обязательный root suite.
- [ ] Website route/contract/XSS tests входят в CI.
- [ ] Typecheck, lint, build и тесты выполняются для всех затронутых workspaces.
- [ ] Serverless bundle пересобирается воспроизводимо либо CI обнаруживает drift.
- [ ] Прямые imports объявлены в owning package manifests.

## Отчёт по завершении каждой задачи

Агент должен указать:

- закрытые finding IDs;
- корневую причину;
- затронутые слои;
- primary signal status;
- точные выполненные проверки и их результат;
- миграции/совместимость/rollout notes;
- оставшиеся риски;
- обновлялась ли документация.
