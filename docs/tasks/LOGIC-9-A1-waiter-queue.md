# LOGIC-9 A1 — WaiterQueue (официант сразу в waitingCook)

**Статус:** Phase 2 фикс. Phase 0/1 ✅ (метрики D: waitingWaiter=20.6, F8=13%, F9=44).

**Ветка:** logic-9-waiter-bottleneck

**Цель:** убрать поход официанта к повару (handoff). Официант принял заказ → сразу `waitingCook` → свободен → принимает следующий. Повар подхватывает через `pickLeastLoadedChef`.

## Проблема (метрики)

- `waitingWaiter = 20.6` — 20 гостей в среднем ждут официанта (принимает 1 заказ → идёт к повару → возвращается)
- `takingOrder = 2.05` — официант в пути к повару или ждёт его
- `F9 = 44 trips / 156 тиков` — 0.28 trips/тик, потолок официанта
- `F8 = 13%` — кухня недогружена (заказы не доходят)
- popularity ×5 (тест D) → F9 **не вырос** → официант bottleneck

## Изменение 1 — `src/simulation/tick.ts`, `updateWaiter`

**Найти блок (около строки 585, после `if (order.state === 'waitingWaiter')`):**

```ts
if (order.state === 'takingOrder') {
  const activeOrder = order;
  let chef = state.employees.find((employee) => employee.id === activeOrder.chefId && employee.role === 'chef');
  if (!chef) {
    chef = pickLeastLoadedChef(
      state.employees.filter((e) => e.role === 'chef'),
      state,
      stoveBurners(state),
    );
    activeOrder.chefId = chef?.id;
  }
  const stove = chef ? stoveForChef(state, chef) : undefined;
  if (!chef || !stove) return;
  const atChef = kitchenDistance(waiter.position, chef.position) === 1;
  const target = adjacentCells(state, { id: chef.id, kind: 'plant', position: chef.position, rotation: 0 })
    .filter((point) => withinChefRange(state, point, stove))
    .map((point) => ({ point, path: routeTo(state, waiter, point) }))
    .filter((candidate) => candidate.path.length > 0 || samePoint(waiter.position, candidate.point))
    .sort((a, b) => a.path.length - b.path.length)[0]?.point;
  const movement = target ? moveActor(state, waiter, target, steps) : 'blocked';
  if ((!atChef || !withinChefRange(state, waiter.position, stove)) && movement === 'blocked') {
    const occupied = occupiedCells(state, waiter);
    const detour = DIRECTIONS
      .map((direction) => ({ x: waiter.position.x + direction.x, y: waiter.position.y + direction.y }))
      .filter((point) => isWalkable(state, point) && !occupied.some((other) => samePoint(point, other)))
      .sort((a, b) => kitchenDistance(a, chef.position) - kitchenDistance(b, chef.position))[0];
    if (detour) moveActor(state, waiter, detour, 1);
  }
  return;
}