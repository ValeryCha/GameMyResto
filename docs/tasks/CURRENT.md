# CURRENT — Restaurant City

**Обновлено:** 2026-11-25
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1 ✅, 8.2 ✅, 8.3 ✅, visual 3D-тарелки ✅, LOGIC-8.4 ✅ (`09afd32`), **LOGIC-8.4.1 ✅ (`a3b37cc`)**.
- **fix-balance ✅ (`d84dbe2`)** — балансировка заказов между поварами (`pickLeastLoadedChef` в 2 точках).
- main = `d84dbe2`, origin/main = `d84dbe2` (sync).
- Unit 381/381, e2e 53/53, build exit 0.
- **Следующая: VISUAL-8.5 — 4 конфорки на плите.**

## Порядок задач

| # | Задача | Статус |
|---|---|---|
| 1 | **VISUAL-8.5** — 4 конфорки на плите (только визуал, логика работает) | **← следующая** |
| 2 | LOGIC-9 — waiter bottleneck (Phase 0 замеры, варианты A1–E2) | бэклог, после VISUAL-8.5 |
| 3 | TECH-3 — `catalog-decorations.spec.ts` | после LOGIC-9 |
| 4 | TECH-2 — `waitForTimeout` → `waitForFunction` | после TECH-3 |
| 5 | TECH-1 — интеграционные тесты мебели | после TECH-2 |
| 6 | TECH-5.1 — e2e для плотной планировки | бэклог |
| 7 | Ф5 (техдолг) — повар без заказов на станцию | по мере |
| 8 | Пакетная чистка веток | отдельным шагом |

## LOGIC-9 — бэклог идей (не потерять)

**Phase 0 — метрики** (до кода): `avgWaitTime`, `waiterIdleTime`, `cookingTime`, `counterFullRate`, `occupiedSeats/guestLimit`, `orders.length`, `avgWaiterTripTime`.

**Варианты после замеров:**
- **A1.** WaiterQueue — официант сразу `waitingCook`, без handoff. 1 сессия.
- **A2.** Multi-pickup — N заказов за подход. 2-3 сессии.
- **A3.** Multi-drop — N готовых (`waiterCarryCapacity`, проверить работает ли).
- **A4.** FIFO-приоритизация — к самому старому заказу.
- **A5.** Разделение ролей (не рекомендую, большая переделка).
- **B1.** Больше слотов на стойку (`COUNTER_MAX_SLOTS = 3` → 4-5).
- **B2.** Прямой handoff повар→официант без стойки.
- **B3.** Counter buffering — официант кладёт, повар берёт.
- **C1-C3.** Расширение ресторана / `arrivalRate` / `guestLimit` (игровое/риск).
- **D1.** `waiterMovementSteps` +1.
- **D2.** Умный путь.
- **E1.** `cookingProgress` быстрее.
- **E2.** VISUAL-8.5 (может решить без отдельной задачи).

Полный контекст — в `handoff-state.md` §6.1.

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
d84dbe2 merge fix: balance orders across chefs
0f12631 fix(kitchen): balance orders across chefs via least-loaded picker
223140a docs: LOGIC-8.4.1 done, VISUAL-8.5 next
a3b37cc merge LOGIC-8.4.1: chef station
65fab54 feat(LOGIC-8.4.1): chef station behind stove, return after delivery
```

## Состояние

- main = `d84dbe2` (sync с origin)
- Теги: `archive/logic-8.4.1-chef-station` = 65fab54, `archive/fix-chef-3x3-diagnostic` = 0f12631, + 10 старых `archive/*`
- Unit 381/381, e2e 53/53, build exit 0

## Что дальше

1. VISUAL-8.5 (4 конфорки) — Phase 0/1 → task-файл → Phase 2–4 → merge → push.
2. LOGIC-9 (waiter bottleneck) — Phase 0 замеры → решение (multi-pickup / waiterQueue / ничего) → спека.
3. TECH-3, TECH-2, TECH-1, TECH-5.1.
4. Пакетная чистка веток — отдельным шагом.

## Техдолг

- **Ф1.** `stoveStation` считает calling chef занятым (excludeActorId).
- **Ф2.** `placeFurniture` откат `pop()` → `splice(indexOf, 1)`.
- **Ф3.** `handoff/task-6.1с.md` — кириллическая «с», не `.DONE.md`.
- **Ф4.** `LOGIC-8.4.1-chef-station.md` — §ФАЗА 0/1 устарели, git-rule B.
- **Ф5.** Повар без заказов не идёт на станцию (визуал).
- **Ф6.** Пакетная чистка веток.
- **Ф7.** `4394b2d relax coins check` — разобрать.

## Блокеры

Нет.