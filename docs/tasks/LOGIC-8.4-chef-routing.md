# LOGIC-8.4 — Фикс маршрутизации поваров и распределения по стойкам

# Зависит от: main = 21fb84a (LOGIC-8.3)
# Затрагивает: src/simulation/commands.ts, src/simulation/kitchen.ts,
#              src/simulation/counterService.ts, src/simulation/tick.ts,
#              tests/chefRouting.test.ts (новый)
# Не трогает: render3d/*, content/*, quests, peak, queue, arrivalRate
# Тип: Код + тесты
# Git: только чтение (git branch, git status, git log, git grep, git diff).

РОЛЬ
Senior TypeScript разработчик проекта «Restaurant City / Мой ресторан». Ты фиксишь два бага в симуляции кухни:
1. Повар застревает после перемещения плиты в редакторе.
2. Одна стойка простаивает из-за жёсткой привязки поваров по индексу.

ЖЁСТКИЕ ИНВАРИАНТЫ (не ломать)
- 1:1 повар↔плита (из LOGIC-7): `synchronizeChefStoves` не должен назначать двух поваров на одну плиту.
- `COUNTER_MAX_SLOTS = 3` (LOGIC-8.1) — не менять.
- `stoveBurners = Math.min(4, 2 + (stoveCount - 1))` (LOGIC-8.3) — не менять.
- `Employee.activeOrders` (LOGIC-8.3) — не переименовывать, не менять тип.
- `Employee.orderIds` (LOGIC-8.2) — не трогать (это для доставки официантами).

ШАГ 0 — БАЗА
1. `git branch --show-current` — main.
2. `git status` — clean.
3. `npm test` — 368/368.

ФАЗА 1 — ИНВЕНТАРИЗАЦИЯ (СТОП, жди «продолжай»)
Кода НЕ писать. Прочитай и выпиши:

| Вопрос | Ответ |
|---|---|
| `moveFurniture` (commands.ts) — вызывает ли `synchronizeChefStoves`? | |
| `withinChefRange` (kitchen.ts) — как проверяет дистанцию? Радиус? | |
| `chefRouteTo` (tick.ts:48) — что делает, если путь пустой? | |
| `updateChef` (tick.ts) — если повар вне зоны, он идёт к плите или стоит? | |
| `counterForChef` (counterService.ts) — по какому принципу выбирает стойку? | |
| `assignOrderToCounter` — кто вызывает, когда, зачем? | |
| `counterDeliveryInterval` — влияет ли на распределение? | |

Пришли таблицу. СТОП.

ФАЗА 2 — ФИКС (после «продолжай»)

**2.1. `moveFurniture` (commands.ts)**
После успешного перемещения предмета:
- Если `item.kind === 'stove'`, найти поваров с `chef.stoveId === item.id`. Для каждого такого повара:
  - Если повар вне `withinChefRange(state, point, item)` — переместить его на ближайшую свободную клетку, примыкающую к новой позиции плиты (через `findPath` или прямой поиск).
  - Сбросить `chef.target`, `chef.activeOrders` (готовка прерывается, заказы возвращаются в `waitingCook`).
- Вызвать `synchronizeChefStoves(state)`.
- Если после перемещения у повара нет плиты — переназначить на свободную.

**2.2. `updateChef` (tick.ts)**
Если `chefRouteTo` возвращает пустой путь, но повар ещё не у плиты — повар должен идти к плите по кратчайшему пути **без проверки `withinChefRange`** (движение к цели, а не внутри зоны). Если путь заблокирован мебелью — повар стоит (текущее поведение), но `withinChefRange` проверять только когда повар **уже** у плиты.

**2.3. `counterForChef` (counterService.ts)**
Заменить приоритет «своя стойка по индексу» на «стойка с наименьшей загрузкой».
- `const candidates = counters.filter(c => counterLoad(state, c.id) < COUNTER_MAX_SLOTS)`.
- Если `candidates` пуст — вернуть `undefined` (ждать).
- Сортировать по `counterLoad` (возрастание). При равенстве — по расстоянию до повара.
- Вернуть первый.

**2.4. `assignOrderToCounter` (если используется)**
Если вызывается при создании заказа — заменить `nextRandom` на выбор стойки с наименьшей загрузкой (`counterLoad`), чтобы заказы распределялись равномерно с самого начала.

ФАЗА 3 — САМОАУДИТ
- `git diff --stat` — только `commands.ts`, `kitchen.ts`, `counterService.ts`, `tick.ts`, `tests/chefRouting.test.ts`.
- Если `render3d/*` в списке — СТОП, объясни.

ФАЗА 4 — ТЕСТЫ + ОТЧЁТ

`tests/chefRouting.test.ts` (новый, 6+ тестов):
1. **Перемещение плиты:** повар на плите-1, плиту двигают в угол → повар перемещается к новой позиции, `chefRouteTo` не пуст.
2. **Прерывание готовки:** при перемещении плиты `activeOrders` очищается, заказы возвращаются в `waitingCook`.
3. **Распределение стоек:** 3 повара, 3 стойки, стойка-1 забита (3 заказа) → повар-2 идёт на стойку-2, повар-3 на стойку-3, никто не ждёт.
4. **Равномерность:** 3 повара, 3 стойки, 6 заказов → по 2 заказа на каждой стойке.
5. **Повар вне зоны:** повар на расстоянии 5 клеток от плиты → идёт к плите, а не стоит.
6. **Регресс:** `chef-stove-binding.test.ts` (17) и `stoveBurners.test.ts` (8) не сломаны.

ПРОВЕРКИ:
- `npm test` — 368 + новые.
- `npm run build` — без ошибок.
- `npx playwright test e2e/staff-stability.spec.ts` — 3/3.

ОТЧЁТ (чек-лист):
1. Резюме.
2. Таблица Phase 1.
3. Диффы: `commands.ts`, `kitchen.ts`, `counterService.ts`, `tick.ts`.
4. Новые тесты `chefRouting.test.ts`.
5. `npm test`, `npm run build`, `npx playwright test ...`.
6. `git diff --stat`.
7. Открытые вопросы (до 3).

ЗАПРЕТЫ:
- Не трогать `render3d/*`, `content/*`, `quests`, `peak`, `queue`, `arrivalRate`.
- Не менять `COUNTER_MAX_SLOTS`, `stoveBurners`, `Employee.orderIds`.
- Не подгонять тесты — пересчитывать с обоснованием.
- Не писать «готово», если `npm test` не запускался.