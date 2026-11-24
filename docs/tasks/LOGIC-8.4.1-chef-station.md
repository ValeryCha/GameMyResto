# LOGIC-8.4.1 — Станция повара за плитой

# Зависит от: main после LOGIC-8.4 (коммит 7331a67)
# Затрагивает: src/simulation/types.ts, src/simulation/commands.ts,
#              src/simulation/kitchen.ts, src/simulation/tick.ts,
#              tests/chefStation.test.ts (новый),
#              tests/chefRouting.test.ts (обновить, если нужно)
# Не трогает: src/render3d/*, src/simulation/counterService.ts,
#              src/content/*, quests, peak, queue, arrivalRate
# Тип: Код + тесты
# ⚠️ Git: ЗАПРЕЩЁН ПОЛНОСТЬЮ. Ни read, ни write. Все git-команды — через
#    пользователя. Ты пишешь «Пользователь, выполни: X», ждёшь вывод,
#    анализируешь. Не пиши «я выполнила git status».

РОЛЬ
Senior TypeScript разработчик проекта «Restaurant City / Мой ресторан».
Реализуешь станцию повара — фиксированную клетку за плитой, к которой
повар автоматически возвращается после доставки заказа.

ПРОБЛЕМА
Сейчас повар может стоять в любой клетке в радиусе 2 от плиты
(`withinChefRange`). Если плиту поставили в угол и окружили мебелью,
повар не может подойти — третья плита простаивает. Плюс визуально
непонятно, где «место повара».

РЕШЕНИЕ (согласовано)
- Станция = клетка по `rotation` плиты (0 → юг, 90 → запад, 180 → север,
  270 → восток). Fallback — ближайшая свободная `adjacentCells`.
- Если станция заблокирована (мебель, стена) — `placeFurniture` /
  `moveFurniture` возвращает `{ ok: false, reason: 'Нет места для повара' }`.
- Повар ходит к стойке сам, готовка прерывается. Отдельный носильщик —
  LOGIC-8.5 (бэклог).

ЖЁСТКИЕ ИНВАРИАНТЫ (не ломать)
- 5 официантов / 5 стоек / 3 повара / 3 плиты.
- 1:1 повар↔плита (`synchronizeChefStoves`).
- `COUNTER_MAX_SLOTS = 3`, `stoveBurners = Math.min(4, 2 + (stoveCount - 1))`,
  `waiterCarryCapacity` (1/2/3).
- `Employee.orderIds` (доставка) ≠ `Employee.activeOrders` (готовка).
- `normalizeState` не вызывает `processProgression`.
- `tests/chef-stove-binding.test.ts` (17), `stoveBurners.test.ts` (8),
  `chefRouting.test.ts` (6), `kitchenBuffers.test.ts` (8),
  `waiterCarry.test.ts` (8) — контракт, не переписывать (только добавлять).

## ФАЗА 0 — БАЗА (СТОП, жди «продолжай»)

Пользователь, выполни и пришли вывод:

```cmd
chcp 65001
git branch --show-current
git status
npm test
```

Ожидание: `main`, clean, **374/374**.

Пришли вывод. Жди «продолжай».

## ФАЗА 1 — ИНВЕНТАРИЗАЦИЯ (СТОП, жди «продолжай»)

Кода НЕ писать. Пользователь, выполни и пришли вывод:

```cmd
git grep -n "chefStation\|chefStationCell\|stationCell" -- src/
type src\simulation\types.ts
type src\simulation\kitchen.ts
git grep -n "withinChefRange\|stoveForChef\|synchronizeChefStoves\|furnitureCells\|adjacentCells" -- src/simulation/kitchen.ts src/simulation/commands.ts src/simulation/tick.ts
git grep -n "placeFurniture\|moveFurniture" -- src/simulation/commands.ts
git grep -n "updateChef\|moveChef\|chefRouteTo" -- src/simulation/tick.ts src/simulation/kitchen.ts
```

По выводу построй таблицу:

| Вопрос | Ответ |
|---|---|
| Как хранится плита 1×1 и 1×2 (`industrialStove`)? Сколько клеток занимает? | |
| Как `furnitureCells` возвращает клетки для 1×2? | |
| Как сейчас повар выбирает цель для движения к плите (`adjacentCells`?)? | |
| Что делает `withinChefRange`? Радиус? | |
| Как `synchronizeChefStoves` назначает поваров на плиты? | |
| Как `updateChef` решает: готовить или идти? | |
| Есть ли в `Furniture` поле `chefStation`? (должно быть пусто) | |
| `placeFurniture` / `moveFurniture` — какие проверки делают перед размещением? | |

**Для плиты 1×2 предложи словами**: как определить лицевую клетку по
`rotation`. Например, для rotation 0 — две клетки снизу от обеих клеток
плиты, выбрать первую свободную. Опиши, не пиши код.

Пришли таблицу + описание 1×2. Жди «продолжай».

## ФАЗА 2 — РЕАЛИЗАЦИЯ (после «продолжай», без git)

### 2.1. `src/simulation/types.ts`

В `Furniture` добавь опциональное поле:

```ts
export interface Furniture {
  id: string;
  kind: FurnitureKind;
  position: Point;
  rotation: 0 | 90 | 180 | 270;
  chefStation?: Point;  // NEW: клетка станции повара (для stove)
}
```

### 2.2. `src/simulation/kitchen.ts` — `stoveStation()`

Добавь экспортируемую функцию:

```ts
export function stoveStation(stove: Furniture, state: GameState): Point | null
```

Логика:
1. По `stove.rotation` вычислить **лицевую** клетку:
   - `rotation 0` → `(stove.position.x, stove.position.y + 1)` (юг)
   - `rotation 90` → `(stove.position.x - 1, stove.position.y)` (запад)
   - `rotation 180` → `(stove.position.x, stove.position.y - 1)` (север)
   - `rotation 270` → `(stove.position.x + 1, stove.position.y)` (восток)
2. Если плита 1×2 (`industrialStove`) — две лицевые клетки, выбрать **первую свободную** (не мебель, не стена, не занята актёром).
3. Если лицевая клетка заблокирована — **fallback**: перебрать `adjacentCells(stove)` в порядке близости, вернуть первую свободную.
4. Если свободных нет — вернуть `null`.

### 2.3. `src/simulation/commands.ts` — `placeFurniture` / `moveFurniture`

**`placeFurniture`**:
1. Перед финальным `ok: true` — если `kind === 'stove'` (или `industrialStove`):
   - Вызвать `stoveStation(furniture, state)` на **временном** state (с уже добавленной мебелью).
   - Если `null` → `{ ok: false, reason: 'Нет места для повара' }`, **не добавлять** мебель.
2. Если `ok` — записать `furniture.chefStation = stoveStation(...)`.

**`moveFurniture`**:
1. То же самое: проверить новую станцию **до** перемещения.
2. Если `null` → `{ ok: false, reason: 'Нет места для повара' }`, не перемещать.
3. При `ok` — обновить `chefStation` и прервать готовку повара на этой плите (готовка продолжится после `moveChef` на новую станцию — или отменить заказ, см. ниже).

**Прерывание готовки:** если повар готовил (`chef.activeOrders` не пуст) на перемещаемой плите — сбросить `activeOrders`, заказы вернуть в `waitingCook` (не `delivered`).

### 2.4. `src/simulation/tick.ts` — `updateChef`

**Перед** существующей логикой `withinChefRange`:
1. Если у повара есть `activeOrders` — он **должен** быть на `chefStation` своей плиты. Если не на станции — `moveChef(chef, chefStation)`.
2. Если повар **доставил** заказ (только что) — `moveChef(chef, chefStation)` для возврата.
3. Только когда `chef.position === chefStation` — начинать готовку.

**Fallback:** если `stove.chefStation` нет (старый сейв) — `stoveStation(stove, state)` **на лету**, без записи в state (обратная совместимость, миграция не нужна).

### 2.5. `src/simulation/normalizeState.ts`

**Не трогать** — `chefStation` опциональное. Если в сейве плита без `chefStation`, `tick.ts` (2.4) вычисляет на лету. Опционально — можно в `normalizeState` добавить `furniture.forEach(f => f.kind === 'stove' && (f.chefStation ??= stoveStation(f, state)))`, но **только если** тесты 8.4.1 это требуют. Без явной необходимости — **не трогать** (инвариант `normalizeState` не вызывает `processProgression` — не расширять).

### 2.6. `tests/chefStation.test.ts` (новый)

Минимум 6 кейсов:
1. `stoveStation` для плиты `rotation: 0` → клетка южнее
2. `stoveStation` для `rotation: 90` / `180` / `270` → запад / север / восток
3. Плита окружена мебелью → `stoveStation` возвращает `null` → `placeFurniture` = `ok: false`
4. `moveFurniture` блокирован, если новая станция занята
5. Повар после доставки возвращается на `chefStation` (через `advanceSimulation` несколько тиков)
6. `industrialStove` (1×2) — лицевая клетка = первая свободная из двух

### 2.7. `tests/chefRouting.test.ts` (обновить, если нужно)

Существующие 6 тестов **не переписывать**. Если после `chefStation` они падают — минимальные правки в setup (добавить `furniture.chefStation` при создании плит в тесте), не менять логику ассертов.

## ФАЗА 3 — САМОАУДИТ (СТОП, жди «продолжай»)

Пользователь, выполни и пришли вывод:

```cmd
git diff --stat
git diff -- src/simulation/types.ts src/simulation/kitchen.ts src/simulation/commands.ts src/simulation/tick.ts
git status
```

Проверь свой дифф:
- [ ] `types.ts` — только `chefStation?: Point` в `Furniture`
- [ ] `kitchen.ts` — только `stoveStation()`
- [ ] `commands.ts` — только проверки в `placeFurniture`/`moveFurniture` + `chefStation` запись
- [ ] `tick.ts` — только `updateChef` (движение к станции)
- [ ] `normalizeState.ts` — **не тронут** (если тронут — объясни почему)
- [ ] `tests/chefStation.test.ts` — новый
- [ ] `tests/chefRouting.test.ts` — если менялся, то только setup, не ассерты
- [ ] **никаких** изменений в `src/content/*`, `questPanel.ts`, `shopPanel.ts`, `progression.ts`

Если что-то лишнее — **СТОП**, пришли `git diff <файл>`, объясни. Жди «продолжай».

## ФАЗА 4 — ТЕСТЫ + ОТЧЁТ

Пользователь, выполни и пришли вывод:

```cmd
npm test
npx playwright test e2e/catalog-decorations.spec.ts --reporter=list
npm run build
```

(Playwright — только **релевантный** спек, не весь набор — правило CURRENT:
«Полный `npx playwright test` — только на финальном гейте»)

Пришли:
1. **Полный вывод** `npm test` — сколько passed/failed
2. **Полный вывод** `npx playwright test e2e/catalog-decorations.spec.ts`
3. **Полный вывод** `npm run build`
4. **Чек-лист готовности** (ниже)
5. **`git status`** — что изменилось (список файлов)

**Чек-лист готовности:**
- [ ] `tests/chefStation.test.ts` — 6/6 passed
- [ ] `tests/chefRouting.test.ts` — 6/6 (не сломано)
- [ ] `tests/chef-stove-binding.test.ts` — 17/17 (не сломано)
- [ ] `tests/stoveBurners.test.ts` — 8/8 (не сломано)
- [ ] `tests/kitchenBuffers.test.ts` — 8/8 (не сломано)
- [ ] `tests/waiterCarry.test.ts` — 8/8 (не сломано)
- [ ] `npm test` — **≥380/380** (374 + минимум 6 новых)
- [ ] `npm run build` — ✅
- [ ] `git diff --stat` — только 6 файлов (4 src + 1 новый test + 1 опционально routing)
- [ ] `normalizeState.ts` — не тронут

## ЕСЛИ ЧТО-ТО УПАЛО

**Не чинить вслепую.** Пришли:
1. Полный текст ошибки
2. `git diff <упавший файл>`
3. Гипотезу: что сломалось и почему

Жди «продолжай» от пользователя/DeepSeek. После согласования — правка.

## ПОСЛЕ ЗАКРЫТИЯ (не твоя работа)

Пользователь коммитит. DeepSeek обновляет `handoff-state.md` (§2, §3, §5,
§8, §13) + `handoff/CURRENT.md`. Следующая задача — VISUAL-8.5 (4 конфорки).