# CURRENT — Restaurant City

**Обновлено:** 2026-11-24
**Сессия:** DeepSeek (архитектор/ревью) + Kimi Code (исполнитель) + пользователь (git)

## Где мы

- LOGIC-8.1 ✅ (буфер стойки 3 слота) — merge `e32bc1d`, push origin.
- LOGIC-8.2 ✅ (мульти-забор официантом 1→2→3) — коммит + merge, unit **350/350**, e2e **53/53**.
- В работе: **feat-counter-plates-visual** — 3D-тарелки на стойке (до 3, треугольником, эмодзи, исчезают при `pickedUp`).

## Порядок задач

| # | Задача | Оценка | Статус |
|---|---|---|---|
| 1 | **feat-counter-plates-visual** — 3D-тарелки на стойке | 1–2 часа | ← в работе |
| 2 | **TECH-3** — `catalog-decorations.spec.ts:50` (убрать `toBeLessThanOrEqual`) | 30 мин | после visual |
| 3 | **TECH-2** — `progression.spec.ts` (`waitForTimeout` → `waitForFunction`) | 30 мин | после TECH-3 |
| 4 | **TECH-1** — интеграционные тесты мебели (FurnitureKind × placement) | 1–2 часа | после TECH-2 |
| 5 | **TECH-5.1** — e2e плотной планировки (если появится `__gameState`) | 1 час | бэклог |
| 6 | **LOGIC-8.3** — конфорки 2→3→4 + повар с массивом заказов 1→4 | 2–3 сессии | бэклог, после TECH-1 |

## Текущая задача: feat-counter-plates-visual

**Проблема:** на стойке показывается 1 статичная иконка, хотя в буфере до 3 заказов (`COUNTER_MAX_SLOTS = 3`).

**Цель:** на стойке — до 3 блюд 3D-тарелками с эмодзи, **треугольником** (2 спереди, 1 сзади). Тарелка исчезает при `order.pickedUp = true`.

**Файлы (ожидаемые):**
- `src/content/dishes.ts` — поле `emoji: string` (32 блюда + fallback `🍽`)
- `src/simulation/counterService.ts` — `counterPlateDishes(state, counterId): string[]` (чистая)
- `src/render3d/world.ts` — `createPlateMesh(emoji)`, `syncCounterPlates(state)`, dispose текстур
- `tests/counterPlates.test.ts` (new) — 10 тестов

**Ограничения:**
- Не менять `chef-stove-binding.test.ts` (17), `waiter-counter-distribution.test.ts` (8), `kitchenBuffers.test.ts` (8), `waiterCarry.test.ts` (8) — контракты
- Не менять логику `updateChef`/`updateWaiter` в `tick.ts`
- Не менять `COUNTER_MAX_SLOTS = 3`
- Не добавлять поля в `GameState` (derived из `state.orders`)
- Обязательный `dispose()` при пересоздании текстур (утечка памяти!)

**Статус:** промпт отправлен в Kimi, ждём результат.

## Структура работы с Kimi Code

1. **DeepSeek** создаёт промпт (Phase 0–4) в `docs/tasks/TASK-XXX.md`
2. **Пользователь** отправляет в Kimi: «Прочитай `TASK-XXX.md`, начни с Phase 0. После Phase 1 — СТОП».
3. **Kimi** проходит Phase 0 (`git status` + `npm test`) → СТОП.
4. **DeepSeek** проверяет базу → «продолжай».
5. **Kimi** Phase 1 (инвентаризация через `git grep`, таблица) → СТОП.
6. **DeepSeek** проверяет таблицу → «продолжай».
7. **Kimi** Phase 2 (код) + Phase 3 (самоаудит `git diff --stat`) + Phase 4 (тесты + отчёт).
8. **DeepSeek** ревью диффов, тестов, чек-листа.
9. **Пользователь** делает `git add` / `commit` / `push`.
10. **DeepSeek** обновляет `handoff-state.md` + `CURRENT.md`.

**Правила:**
- Kimi не трогает git (только чтение)
- Запреты — на функции, не на файлы
- Phase 1 — `git grep`, не «по памяти»
- Полный `npx playwright test` — только на финальном гейте (не на каждой итерации)
- Push = последний шаг, после полного e2e зелёного

## Последние коммиты

<logic-8.2 merge> merge: LOGIC-8.2 waiter multi-carry
<hash-8.2> feat(LOGIC-8.2): waiter multi-carry (1→2→3 via upgrades.waiter)
e32bc1d merge: LOGIC-8.1 counter buffer 3 slots
0d4d8ea fix(LOGIC-8.1): revert hidden on panels, update wallpaper inheritance test
b8a18df feat(LOGIC-8.1): counter buffer (3 slots) + chef preferred counter logic

## Состояние

- `main` = `origin/main` = `<последний merge-коммит>` (LOGIC-8.2)
- Ветки: `main`, `master` (архив), `feat-counter-plates-visual` (в работе)
- Теги: `archive/*` (10)
- Unit: **350/350** (до visual) / **360/360** (после visual)
- e2e: **53/53**, build ✅
- `git status`: clean

## Что дальше

1. Kimi выполняет `feat-counter-plates-visual` по промпту
2. Пользователь коммитит, DeepSeek ревью
3. Merge в `main` + push
4. После visual — TECH-3 → TECH-2 → TECH-1

## Блокеры

Нет.

## LOGIC-8.3 — контекст (бэклог, после TECH-1)

**Цель:** дать плите несколько «слотов готовки» (конфорок), чтобы повар мог готовить N блюд параллельно. Сейчас 1 повар = 1 заказ, даже если у него 3 плиты (из-за строгой 1:1 он использует только одну).

**Решения (согласованы в сессии 2026-11-24):**

| Конфигурация | Конфорок на каждой плите | Всего конфорок | Повар (рук) | Занято |
|---|---|---|---|---|
| 1C/1S | 2 | 2 | 1 повар × 2 руки | 2 |
| 2C/2S | 3 | 6 (3 × 2 плиты) | 2 повара × 3 руки | 6 |
| 3C/3S | 4 | 12 (4 × 3 плиты) | 3 повара × 4 руки | 12 |

**Ключевые правила:**
- Конфорки зависят от **общего количества плит**: `stoveBurners = 2 + (stoveCount - 1)`, макс 4.
- Повар занимает **до 4 конфорок на СВОЕЙ плите** (не на разных — контракт `chef.stoveId` из LOGIC-7).
- 1:1 повар↔плита **не ломается**. При 1C/2S 2-я плита простаивает (повар не может использовать чужую).
- Глобальный лимит: 12 конфорок (3 плиты × 4).

**Технические изменения:**
- `kitchen.ts`: `stoveBurners(state): number` = `2 + (stoveCount(state) - 1)`, макс 4.
- `types.ts`: `Employee.activeOrders?: string[]` (до 4). Не путать с `Employee.orderIds` (LOGIC-8.2) — тот для доставки, этот для готовки.
- `updateChef` в `tick.ts`: переписать с 1 заказа на массив. Повар занимает `min(burners, freeSlots, свободные заказы)`.
- `updateKitchenOrders`: распределять заказы по конфоркам, а не по плитам.

**Риски:**
- `chef-stove-binding.test.ts` (17) — 1:1 сохранится, но тесты `конфигурация 1/1`, `2/2`, `3/3` могут упасть (повар теперь готовит 2/3/4 блюда параллельно, а не 1).
- `kitchenBuffers.test.ts` (8) — не сломать (буфер стойки 3 = `COUNTER_MAX_SLOTS`).
- `waiterCarry.test.ts` (8) — не сломать (мульти-забор 1→2→3).

**План:**
1. TDD: `tests/stoveBurners.test.ts` (8–10 тестов: 1/1=2, 2/2=6, 3/3=12, повар 4 руки, лимит 4, 1/2/1 = 2-я плита простаивает).
2. Реализация: `stoveBurners`, `Employee.activeOrders`, переписать `updateChef`/`updateKitchenOrders`.
3. Обновить 17 тестов `chef-stove-binding` — заменить «повар готовит 1 блюдо» на «повар готовит N блюд параллельно».
4. Проверить `kitchenBuffers` (8), `waiterCarry` (8).
5. E2E `staff-stability.spec.ts` — проверить, что с 4 конфорками производительность выше.

**Не делать:**
- Не разрешать повару занимать конфорки **на разных плитах** (ломает 1:1).
- Не увеличивать `COUNTER_MAX_SLOTS` (остаётся 3).
- Не менять `waiterCarryCapacity` (LOGIC-8.2).

**Оценка:** 2–3 сессии. Начинать **только после TECH-1** (все три TECH закрыты).