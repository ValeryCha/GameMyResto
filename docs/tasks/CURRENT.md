# CURRENT — Restaurant City

**Обновлено:** 2026-11-24
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1 ✅ (`e32bc1d`), LOGIC-8.2 ✅ (`ce64fc4`), LOGIC-8.3 ✅ (`21fb84a`).
- Визуал 3D-тарелки ✅ (`4d089e2`).
- **LOGIC-8.4** ✅ — `09afd32`, 374/374 unit.
- Следующая задача: **LOGIC-8.4.1 — станция повара за плитой**.

## Порядок задач

| # | Задача | Статус |
|---|---|---|
| 1 | LOGIC-8.4 — маршрутизация поваров и стоек | ✅ 2026-11-24 |
| 2 | **LOGIC-8.4.1** — станция повара за плитой | ← следующий |
| 3 | VISUAL-8.5 — 4 конфорки на плите | после 8.4.1 |
| 4 | TECH-3 | после visual |
| 5 | TECH-2 | после TECH-3 |
| 6 | TECH-1 | после TECH-2 |
| 7 | TECH-5.1 | бэклог |

## Текущая задача: LOGIC-8.4.1

**Цель:** привязать повара к станции (лицевой части плиты). Повар автоматически возвращается на станцию после доставки заказа.

**Решения:**
- Станция по `rotation` (0 → юг, 90 → запад, 180 → север, 270 → восток). Fallback — ближайшая свободная.
- Если станция заблокирована — `placeFurniture`/`moveFurniture` → `ok: false`.
- Повар ходит к стойке сам, готовка прерывается.

**Файлы:**
- `src/simulation/types.ts` — `Furniture.chefStation?: Point`
- `src/simulation/commands.ts` — вычисление станции при place/move
- `src/simulation/kitchen.ts` — `stoveStation()`
- `src/simulation/tick.ts` — `updateChef` идёт к станции
- `tests/chefStation.test.ts` (новый)

**Статус:** не начата. Task-файл создать перед стартом.

## Структура работы с Kimi Code

1. **DeepSeek** создаёт `docs/tasks/TASK-XXX.md` (Phase 0–4).
2. **Пользователь** отправляет в Kimi: «Прочитай `TASK-XXX.md`, начни с Phase 0. После Phase 1 — СТОП».
3. **Kimi** проходит Phase 0 → СТОП, Phase 1 → СТОП.
4. **DeepSeek** проверяет таблицы, даёт «продолжай».
5. **Kimi** делает Phase 2 (код) + Phase 3 (самоаудит) + Phase 4 (тесты + отчёт).
6. **DeepSeek** ревьюит диффы.
7. **Пользователь** коммитит, push.
8. **DeepSeek** обновляет handoff + CURRENT.

**Правила:**
- Kimi не трогает git (только чтение).
- Запреты на функции, не на файлы.
- Phase 1 — `git grep`, не по памяти.
- Полный `npx playwright test` — только на финальном гейте.
- Push — последний шаг.

## Последние коммиты

`3cbb59d` (main) — LOGIC-8.3 + docs
`21fb84a` — merge LOGIC-8.3
`4d089e2` — visual + docs LOGIC-8
`ce64fc4` — merge LOGIC-8.2
`a06f277` docs: add LOGIC-8.4.1 chef station task
`09afd32` feat(LOGIC-8.4): chef routing + counter load balancing

## Состояние

- `main` = `origin/main` = `3cbb59d`
- Ветки: `main`, `master` (архив)
- Теги: `archive/*` (10)
- Unit: 368/368 (main), 374/374 (рабочая папка)
- e2e: 53/53, build ✅
- `git status`: изменения LOGIC-8.4

## Что дальше

1. Закоммитить LOGIC-8.4 (если ещё нет).
2. Создать `docs/tasks/LOGIC-8.4.1-chef-station.md`.
3. Kimi выполняет LOGIC-8.4.1.
4. DeepSeek ревьюит, пользователь коммитит.
5. После 8.4.1 — VISUAL-8.5.

## Блокеры

Нет.