# LOGIC-8.4.1 — Станция повара за плитой

# Зависит от: main после LOGIC-8.4 (коммит feat(LOGIC-8.4))
# Затрагивает: src/simulation/types.ts, src/simulation/commands.ts,
#              src/simulation/kitchen.ts, src/simulation/tick.ts,
#              tests/chefStation.test.ts (новый),
#              tests/chefRouting.test.ts (обновить, если нужно)
# Не трогает: src/render3d/*, src/simulation/counterService.ts,
#              src/content/*, quests, peak, queue, arrivalRate
# Тип: Код + тесты
# Git: только чтение (git branch, git status, git log, git grep, git diff).

РОЛЬ
Senior TypeScript разработчик проекта «Restaurant City / Мой ресторан». Ты реализуешь станцию повара — фиксированную клетку за плитой, к которой повар автоматически возвращается после доставки заказа.

ПРОБЛЕМА
Сейчас повар может стоять в любой клетке в радиусе 2 от плиты (`withinChefRange`). Если плиту поставили в угол и окружили мебелью, повар не может подойти — третья плита простаивает. Плюс визуально непонятно, где «место повара».

РЕШЕНИЕ (согласовано)
- Станция = клетка по `rotation` плиты (0 → юг, 90 → запад, 180 → север, 270 → восток). Fallback — ближайшая свободная `adjacentCells`.
- Если станция заблокирована (мебель, стена) — `placeFurniture` / `moveFurniture` возвращает `{ ok: false, reason: 'Нет места для повара' }`.
- Повар ходит к стойке сам, готовка прерывается. Отдельный носильщик — LOGIC-8.5 (бэклог).

ЖЁСТКИЕ ИНВАРИАНТЫ (не ломать)
- 5 официантов / 5 стоек / 3 повара / 3 плиты.
- 1:1 повар↔плита (`synchronizeChefStoves`).
- `COUNTER_MAX_SLOTS = 3`, `stoveBurners = Math.min(4, 2 + (stoveCount - 1))`, `waiterCarryCapacity` (1/2/3).
- `Employee.orderIds` (доставка) ≠ `Employee.activeOrders` (готовка).
- `normalizeState` не вызывает `processProgression`.

ШАГ 0 — БАЗА
1. `git branch --show-current` — main.
2. `git status` — clean.
3. `npm test` — 374/374.

ФАЗА 1 — ИНВЕНТАРИЗАЦИЯ (СТОП, жди «продолжай»)
Кода НЕ писать. Прочитай `types.ts` (Furniture), `commands.ts` (placeFurniture, moveFurniture), `kitchen.ts` (stoveForChef, synchronizeChefStoves, withinChefRange, furnitureCells), `tick.ts` (updateChef, moveChef, chefRouteTo), `grid.ts` (isWalkable, findPath). Выпиши таблицу:

| Вопрос | Ответ |
|---|---|
| Как хранится плита 1×1 и 1×2 (`industrialStove`)? Сколько клеток занимает? | |
| Как `furnitureCells` возвращает клетки для 1×2? | |
| Как сейчас повар выбирает цель для движения к плите (`adjacentCells`?)? | |
| Что делает `withinChefRange`? Радиус? | |
| Как `synchronizeChefStoves` назначает поваров на плиты? | |
| Как `updateChef` решает: готовить или идти? | |
| Есть ли в `Furniture` поле `chefStation`? (должно быть пусто) | |

**Для плиты 1×2 предложи**, как определить лицевую клетку по `rotation` (например, для rotation 0 — две клетки снизу от обеих клеток плиты, выбрать первую свободную). Опиши словами.

**СТОП.** Жди «продолжай».

ФАЗА 2 — РЕАЛИЗАЦИЯ (после «продолжай»)

**2.1. `types.ts`**
В `Furniture` добавь опциональное поле:
```ts
chefStation?: Point