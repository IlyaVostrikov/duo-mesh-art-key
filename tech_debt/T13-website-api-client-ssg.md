# T13 — Сайт: один API-клиент + честный `getStaticPaths`

- **Приоритет:** 7/10
- **Стадия:** Stage 2
- **Область:** website
- **Статус:** backlog

## Что не так

1. **Три расходящихся API-клиента:**
   - `website/src/lib/api.ts` (72 строки, типизированный, **мёртвый** — 0 импортов);
   - `website/public/api-client.js` (45 строк, живой, нетипизированный, грузится глобально);
   - `website/src/env.d.ts` (третий раз переобъявляет интерфейсы).
2. **Hostname-переключатель env** в `public/api-client.js` (~L5-6): `localhost` → `http://localhost:3000`, иначе зашитый прод-URL. Preview/staging молча указывают на прод.
3. **Фейковый `getStaticPaths`**: `artworks/[id].astro`, `artists/[id].astro`, `halls/[slug].astro` возвращают `[{ params: { id: "view" } }]`, а страница парсит `window.location.pathname.split('/').pop()`. Страницы не пререндерятся per-entity — убивает SSG/SEO Astro.

## Почему это важно

Дрейф API-формы ломает сайт молча (два из трёх файлов невидимы тайпчекеру). Зашитый прод-URL ломает preview. Фейковые статик-пути обесценивают ядро Astro (SSG/SEO) и хрупки к query-строкам.

## Локализация

- `website/src/lib/api.ts` — мёртвый модуль.
- `website/public/api-client.js` — живой клиент.
- `website/src/env.d.ts` — третья копия типов.
- `website/src/pages/artworks/[id].astro:2-4,29`, `artists/[id].astro`, `halls/[slug].astro` — фейковый getStaticPaths + window.location.

## Минимальная правка

1. Удалить мёртвый `lib/api.ts`; сделать клиент реальным модулем (`<script type="module">`), типизировать против одного источника.
2. URL из `import.meta.env.PUBLIC_API_URL` (build-time), а не hostname.
3. Либо реальный `getStaticPaths` (фетч списков сущностей на билде), либо один явный client-only `[...path].astro` catch-all — без фейка.

## Подводные камни

- **Реальный getStaticPaths требует данных на билде** (или `output: 'server'`/ISR) — проверить, есть ли доступ к списку сущностей на этапе сборки; иначе честнее client-only catch-all.
- **Не ломать XSS-фикс (T02)** — при переносе клиента сохранить экранирование.
- **env-переменная должна быть `PUBLIC_`** префиксной в Astro, иначе не попадёт в клиентский бандл.

## Приёмочные критерии

1. `lib/api.ts` удалён, остался один типизированный клиент.
2. Preview/staging не указывают на прод (URL из env).
3. Детальные страницы либо пререндерятся per-entity, либо явно client-only.
4. `bun run --cwd website build` зелёный.

## Валидация

```bash
bun run --cwd website build
# ручная проверка preview: детальная страница + API-URL из env
```

## Связанные задачи

- T02 (XSS)
- T19 (dead-code)
