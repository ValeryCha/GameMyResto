# CURRENT — Restaurant City

**Обновлено:** 2026-11-25
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1 ✅, 8.2 ✅, 8.3 ✅, visual 3D-тарелки ✅, LOGIC-8.4 ✅ (`09afd32`).
- **LOGIC-8.4.1 — станция повара — в работе.** Ветка `logic-8.4.1-chef-station`, Phase 2 (код).
- main = `ddc4afe` (docs LOGIC-8.4.1 task), origin/main = `7331a67`.
- Unit 374/374, e2e 53/53, build ✅.

## Порядок задач

| # | Задача | Статус |
|---|---|---|
| 1 | **LOGIC-8.4.1** — станция повара за плитой | **← в работе** |
| 2 | VISUAL-8.5 — 4 конфорки на плите | после 8.4.1 |
| 3 | TECH-3 — `catalog-decorations.spec.ts` | после visual |
| 4 | TECH-2 — `waitForTimeout` → `waitForFunction` | после TECH-3 |
| 5 | TECH-1 — интеграционные тесты мебели | после TECH-2 |
| 6 | TECH-5.1 — e2e для плотной планировки | бэклог |

## Текущая задача: LOGIC-8.4.1

**Цель:** станция повара = фиксированная клетка за плитой по rotation. Возврат после доставки.

**Решения:**
- rotation: 0→юг, 90→запад, 180→север, 270→восток. Fallback adjacentCells → null.
- Заблокирована станция → `placeFurniture`/`moveFurniture` → `{ok: false, reason: 'Нет места для повара'}`.
- **НЕ блокировать прогресс готовки** при отсутствии на станции.
- `industrialStove` — скин, не kind.
- Fallback `chefStation === undefined` → `adjacentCells` в `updateChef`.

**Файлы:**
- `src/simulation/types.ts` — `Furniture.chefStation?: Point`
- `src/simulation/kitchen.ts` — `stoveStation()`
- `src/simulation/commands.ts` — проверки в place/move
- `src/simulation/tick.ts` — `updateChef` возврат
- `tests/chefStation.test.ts` (новый, 6)

**Статус:** Phase 1 ✅, Phase 2 (код) — ждём ответ Kimi.

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
ddc4afe docs: complete LOGIC-8.4.1 task under git-rule B
7331a67 docs: LOGIC-8.4 done, LOGIC-8.4.1 next
a06f277 docs: add LOGIC-8.4.1 chef station task
09afd32 feat(LOGIC-8.4): chef routing + counter load balancing
3cbb59d docs: add LOGIC-8.4 chef routing task
```

## Состояние

- main = `ddc4afe` (ahead of origin by 1)
- origin/main = `7331a67`
- Ветка: `logic-8.4.1-chef-station` (в работе)
- Теги: `archive/*` (10)
- Unit 374/374, e2e 53/53, build ✅

## Что дальше

1. Ждать ответ Kimi (Phase 2).
2. Ревью → Phase 3 → Phase 4.
3. Пользователь: коммит feat → merge `--no-ff` в main → `npm test` на main → build → push.
4. DeepSeek: обновить handoff §2, §3, §5, §8, §13 + CURRENT.
5. VISUAL-8.5 (после 8.4.1).

## Техдолг (погасить после 8.4.1)

- `handoff/task-6.1с.md` — кириллическая «с» + не `.DONE.md`
- `handoff/CURRENT.md` — устарел (main, 368→374, git-rule)
- `docs/tasks/LOGIC-8.4.1-chef-station.md` — §ФАЗА 0 «main», §ФАЗА 1 «adjacentCells в grid.ts», «Git запрещён»
- `4394b2d relax coins check` — разобрать для TECH-3

## Блокеры

Нет.