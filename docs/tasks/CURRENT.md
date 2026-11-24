# CURRENT — Restaurant City

**Обновлено:** 2026-11-25
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1 ✅, 8.2 ✅, 8.3 ✅, visual 3D-тарелки ✅, LOGIC-8.4 ✅ (`09afd32`), **LOGIC-8.4.1 ✅ (`a3b37cc`)**.
- main = `a3b37cc`, origin/main = `a3b37cc` (sync).
- Unit 380/380, e2e 53/53, build exit 0.
- **Следующая: VISUAL-8.5 — 4 конфорки на плите.**

## Порядок задач

| # | Задача | Статус |
|---|---|---|
| 1 | **LOGIC-8.4.1** — станция повара за плитой | **← в работе** |
| 2 | VISUAL-8.5 — 4 конфорки на плите | после 8.4.1 |
| 3 | TECH-3 — `catalog-decorations.spec.ts` | после visual |
| 4 | TECH-2 — `waitForTimeout` → `waitForFunction` | после TECH-3 |
| 5 | TECH-1 — интеграционные тесты мебели | после TECH-2 |
| 6 | TECH-5.1 — e2e для плотной планировки | бэклог |

## Текущая задача: VISUAL-8.5 (следующая сессия)

**Цель:** 4 конфорки на плите (визуально + логика).

**Статус:** task-файл ещё не создан. Следующий шаг — Phase 0/1 (Kimi) → DeepSeek пишет `docs/tasks/VISUAL-8.5-stove-4-burners.md`.

**Инвариант:** `stoveBurners = Math.min(4, 2 + (stoveCount - 1))` — не трогать без согласования (см. handoff §8).

## Структура работы с Kimi Code

1. **DeepSeek** создаёт `docs/tasks/TASK-XXX.md` (Phase 0–4).
2. **Пользователь** отправляет в Kimi: «Прочитай `TASK-XXX.md`, начни с Phase 0».
3. **Kimi** проходит Phase 0 → STOP, Phase 1 → STOP.
4. **DeepSeek** ревьюит, «продолжай».
5. **Kimi** делает Phase 2 (код) + Phase 3 (самоаудит) + Phase 4 (тесты + отчёт).
6. **DeepSeek** ревьюит диффы.
7. **Пользователь** коммитит, push.
8. **DeepSeek** обновляет handoff + CURRENT.

**Правила:**
- **Git-правило Kimi: A (read-only)** по умолчанию — `git status/log/diff/grep/show/branch` может, write — нет. Task-файлы под A. **Подтвердить A/B в начале сессии.**
- Запреты на функции, не на файлы.
- Phase 1 — `git grep`, не по памяти.
- Полный `npx playwright test` — только на финальном гейте.
- Push — последний шаг.
- **Не быть многословным.** Лимиты тратятся.

## Последние коммиты

```
a3b37cc merge LOGIC-8.4.1: chef station
65fab54 feat(LOGIC-8.4.1): chef station behind stove, return after delivery
192a5b6 docs: handoff snapshot 2026-11-25 (LOGIC-8.4.1 Phase 2 in work)
ddc4afe docs: complete LOGIC-8.4.1 task under git-rule B
7331a67 docs: LOGIC-8.4 done, LOGIC-8.4.1 next
```

## Состояние

- main = `a3b37cc` (sync с origin)
- Ветка `logic-8.4.1-chef-station` удалена, тег `archive/logic-8.4.1-chef-station` = `65fab54`
- Теги: `archive/*` (11)
- Unit 380/380, e2e 53/53, build exit ✅

## Что дальше

1. VISUAL-8.5 (4 конфорки) — Phase 0/1 → task-файл → Phase 2–4 → merge → push.
2. TECH-3 (`catalog-decorations.spec.ts`) — разобрать `4394b2d`.
3. TECH-2, TECH-1, TECH-5.1 — по цепочке.

## Техдолг (после 8.4.1)

- `stoveStation` — считает calling chef занятым (Ф1, работает только благодаря lock-in)
- `placeFurniture` — откат через `pop()` (Ф2, fragile, лучше `splice`)
- `handoff/task-6.1с.md` — кириллическая «с» + не `.DONE.md`
- `docs/tasks/LOGIC-8.4.1-chef-station.md` — §ФАЗА 0 «main», §ФАЗА 1 «adjacentCells в grid.ts», «Git запрещён» (B)
- Локальные ветки `logic-8.1/8.2/8.3`, `feat-counter-plates-visual` + remote `origin/logic-1-v3-specs`, `origin/wip-overnight` — пакетная чистка (теги `archive/*`)

## Блокеры

Нет.