# Restaurant Shop and Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive slide-out shop, placed furniture, staff hiring, door relocation, restaurant growth, actor collisions and a gameplay-relevant 0–100 rating without replacing the current game.

**Architecture:** Pure simulation commands own prices and mutations; the shop panel emits intents, while RestaurantWorld owns pointer placement and rebuilds only changed visuals. Existing save envelopes and simulation entry point remain unchanged.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, localStorage.

## Global Constraints

- Initial grid is 8×8; every expansion is exactly +2×+2.
- Seat-search patience is 300 seconds and food patience is 120 seconds.
- New games have no waiter or counter; both must be purchased.
- Prices: waiter 200, counter 300, table 100, double table 200, chair 75, plant 50, door move 100, guest limit +1 for 5000, expansion for 10000.
- No paid assets, external services or independent browser timers.
- Execute inline without subagents; do not leave a development server running.

---

### Task 1: Purchasable state, rating and atomic shop commands

**Files:**
- Create: `src/simulation/shop.ts`, `tests/shop.test.ts`
- Modify: `src/simulation/types.ts`, `src/content/coreContent.ts`, `src/simulation/createGame.ts`, `src/simulation/commands.ts`, `src/simulation/grid.ts`, `src/persistence/normalizeState.ts`
- Test: `tests/commands.test.ts`, `tests/storage.test.ts`

**Interfaces:**
- Produces `hireWaiter(state): CommandResult`, `increaseGuestLimit(state): CommandResult`, `expandRestaurant(state): CommandResult`.
- Produces `moveDoor(state, position): CommandResult` and extends `placeFurniture` with `tableDouble`.
- Produces `furnitureCells(item): Point[]` for occupancy checks.

- [ ] **Step 1: Write failing command tests**

```ts
it('покупает стол 1×1 за 100 и повышает рейтинг', () => {
  const state = createGame();
  expect(placeFurniture(state, 'table', { x: 3, y: 5 }).ok).toBe(true);
  expect(state.coins).toBe(900);
  expect(state.popularity).toBe(11);
});
it('проверяет обе клетки двойного стола и не списывает при ошибке', () => {
  const state = createGame();
  expect(placeFurniture(state, 'tableDouble', { x: 6, y: 6 }).ok).toBe(true);
  expect(state.coins).toBe(800);
  expect(placeFurniture(state, 'chair', { x: 7, y: 6 }).ok).toBe(false);
  expect(state.coins).toBe(800);
});
it('нанимает официанта, покупает лимит и расширяет ровно на 2×2', () => {
  const state = createGame();
  expect(state.employees.some((e) => e.role === 'waiter')).toBe(false);
  expect(hireWaiter(state).ok).toBe(true);
  expect(state.employees.filter((e) => e.role === 'waiter')).toHaveLength(1);
  state.coins = 16000;
  expect(increaseGuestLimit(state).ok).toBe(true);
  expect(state.guestLimit).toBe(8);
  expect(expandRestaurant(state).ok).toBe(true);
  expect([state.width, state.height]).toEqual([10, 10]);
});
it('переносит дверь только на свободную границу за 100', () => {
  const state = createGame();
  expect(moveDoor(state, { x: 4, y: 4 }).ok).toBe(false);
  expect(moveDoor(state, { x: 7, y: 4 }).ok).toBe(true);
  expect(state.furniture.find((f) => f.kind === 'door')?.position).toEqual({ x: 7, y: 4 });
  expect(state.coins).toBe(900);
});
```

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/shop.test.ts tests/commands.test.ts tests/storage.test.ts`.
Expected: FAIL because `shop.ts`, `moveDoor` and `tableDouble` do not exist.

- [ ] **Step 3: Implement contracts and prices**

Use numeric `width: number; height: number`. Add `tableDouble` to `FurnitureKind`. Set catalog prices exactly to 100/200/75/50/300 and add a rating field to each catalog entry: table 1, tableDouble 2, chair 1, plant 1, counter 5. Remove the initial waiter and counter from `createGame`; retain chef, stove, table, chair and door. Do not remove old saves' entities in `normalizeState`.

```ts
export function furnitureCells(item: Furniture): Point[] {
  return item.kind === 'tableDouble'
    ? [item.position, { x: item.position.x + 1, y: item.position.y }]
    : [item.position];
}
```

Use `furnitureCells` in `isWalkable` and `placeFurniture`. After successful placement add the catalog rating and clamp popularity to 100.

- [ ] **Step 4: Implement shop commands and door movement**

```ts
function spend(state: GameState, price: number, rating: number): boolean {
  if (state.coins < price) return false;
  state.coins -= price;
  state.popularity = Math.min(100, state.popularity + rating);
  return true;
}
```

`hireWaiter` spends 200/+10 and appends `{id:'waiter-'+state.tick+'-'+state.employees.length, role:'waiter', position:{x:2,y:2}, energy:100}`. `increaseGuestLimit` spends 5000/+3 and increments once. `expandRestaurant` spends 10000/+15 and increments width and height by 2. `moveDoor` rejects non-border/occupied cells, spends 100/+2 and mutates the existing door position.

- [ ] **Step 5: Verify GREEN and commit**

Run `npm test && npm run build`.
Expected: all existing tests that assumed free service are updated in Task 2; do not commit until Task 2 makes the suite green.

---

### Task 2: Rating-driven arrivals and multiple collision-aware workers

**Files:**
- Modify: `src/simulation/movement.ts`, `src/simulation/tick.ts`
- Test: `tests/movement.test.ts`, `tests/tick.test.ts`, `tests/ai.test.ts`

**Interfaces:**
- Consumes Task 1 state and furniture occupancy.
- Preserves `advanceSimulation(state, steps=1)` and `moveToward` result union.

- [ ] **Step 1: Write failing behavior tests**

```ts
it('не входит на клетку другого персонажа', () => {
  const state = createGame();
  const actor = state.employees[0];
  actor.position = { x: 2, y: 2 };
  state.customers.push({ id:'blocker', position:{x:2,y:3}, state:'waitingFood', patience:300 });
  expect(moveToward(state, actor, { x: 2, y: 4 })).toBe('blocked');
  expect(actor.position).toEqual({ x: 2, y: 2 });
});
it('не исчезает готовый заказ без стойки и официанта', () => {
  const state = createGame();
  advanceSimulation(state, 80);
  expect(state.orders.some((o) => o.state === 'cooking')).toBe(true);
  expect(state.coins).toBe(1000);
});
it('рейтинг сокращает интервал появления до 18 секунд', () => {
  const state = createGame();
  state.popularity = 100;
  advanceSimulation(state, 19);
  expect(state.customers).toHaveLength(2);
});
```

Change the old payment test setup with `hireWaiter(state); placeFurniture(state,'counter',{x:2,y:1});` before advancing. Assert no cook ever starts a completed order when no counter exists.

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/movement.test.ts tests/tick.test.ts tests/ai.test.ts`.
Expected: collision and rating-arrival tests FAIL; free-service assumptions are explicitly replaced by purchase setup.

- [ ] **Step 3: Add dynamic next-cell occupancy**

After A* returns, find the actor's own ID when available and return `blocked` if `path[0]` is occupied by a different employee/customer. Keep static A* unchanged so temporary actors do not permanently corrupt routes.

```ts
const occupied = [...state.employees, ...state.customers].some((other) =>
  other.id !== ('id' in actor ? actor.id : undefined) && samePoint(other.position, path[0]));
if (occupied) return 'blocked';
```

- [ ] **Step 4: Update cadence and all waiters**

Use `const interval = Math.round(30 - 12 * state.popularity / 100)` and spawn on tick 1 or `tick % interval === 1`. Iterate `state.employees.filter(e => e.role === 'waiter')` instead of updating only the first. Clamp successful service to popularity 100 and unhappy exits to 0. Keep food waiting and no-counter retention behavior unchanged.

- [ ] **Step 5: Verify and commit Tasks 1–2**

Run `npm test && npm run build`.
Expected: all tests PASS and TypeScript build succeeds.

```bash
git add src tests
git commit -m "feat: add restaurant shop economy and rating"
```

---

### Task 3: Slide-out shop UI and placement modes

**Files:**
- Create: `src/ui/shopPanel.ts`, `src/ui/shopPanel.css`, `tests/shopPanel.test.ts`
- Modify: `src/ui/hud.ts`, `src/ui/styles.css`, `src/main.ts`

**Interfaces:**
- Produces `SHOP_ITEMS`, `canAfford(state, item)` and `createShopPanel(callbacks)` with `update(state)`, `setVisible(boolean)`, `close()`, `setPlacement(label | null)`.
- Callbacks: `onHire`, `onLimit`, `onExpand`, `onPlace(kind)`, `onMoveDoor`, `onCancelPlacement`, `onChange`.

- [ ] **Step 1: Write failing pure panel-model tests**

```ts
it('содержит все три вида мебели и проверяет доступность по балансу', () => {
  expect(SHOP_ITEMS.find((item) => item.id === 'table')).toMatchObject({ label: 'Стол 1×1', price: 100 });
  expect(SHOP_ITEMS.find((item) => item.id === 'tableDouble')).toMatchObject({ label: 'Стол 2×1', price: 200 });
  expect(SHOP_ITEMS.find((item) => item.id === 'chair')).toMatchObject({ label: 'Стул', price: 75 });
  expect(canAfford(createGame(), SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(true);
  expect(canAfford({ ...createGame(), coins: 99 }, SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(false);
});
```

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/shopPanel.test.ts`.
Expected: FAIL because the panel module does not exist.

- [ ] **Step 3: Implement panel and responsive styling**

Create a fixed `<aside aria-label="Магазин ресторана">` with category headings and buttons named exactly `Официант — 200 монет`, `Стойка выдачи — 300 монет`, `Стол 1×1 — 100 монет`, `Стол 2×1 — 200 монет`, `Стул — 75 монет`, `Растение — 50 монет`, `Перенести дверь — 100 монет`, `+1 гость — 5000 монет`, `Расширить +2×2 — 10000 монет`. Update disabled states and visible balance/rating on every frame. CSS transform transitions slide from the right desktop edge and bottom on screens below 600px. Do not add animation timers.

Replace the old plant button with `Магазин` and rename HUD `Популярность` to `Рейтинг`. The HUD hint must expose the selected object and a visible `Отмена` button.

- [ ] **Step 4: Wire intents without placing yet**

In `main.ts`, instantiate the panel, show it only during play, call `update` per frame, save after immediate purchases, and pass placement intents to world methods. Immediate commands call their Task 1 function once. `onChange` saves and updates both HUD and shop.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build`.
Expected: all tests PASS; the shop opens and displays current balance.

```bash
git add src tests
git commit -m "feat: add responsive restaurant shop panel"
```

---

### Task 4: Grid placement, door relocation and expansion visuals

**Files:**
- Modify: `src/render3d/RestaurantWorld.ts`, `src/render3d/models.ts`, `src/render3d/coordinates.ts`
- Test: `tests/models3d.test.ts`, `tests/coordinates3d.test.ts`

**Interfaces:**
- Produces `setPlacementMode(kind: FurnitureKind | null)`, `setDoorMoveMode(enabled: boolean)`, `cancelPlacement()`.
- Consumes atomic commands and `furnitureCells`.

- [ ] **Step 1: Write failing visual-model tests**

```ts
it('двойной стол занимает две клетки и имеет широкую столешницу', () => {
  const table = createFurnitureMesh({id:'double',kind:'tableDouble',position:{x:3,y:3},rotation:0}, classicSkin);
  const bounds = new THREE.Box3().setFromObject(table);
  expect(bounds.max.x - bounds.min.x).toBeGreaterThan(1.7);
  expect(furnitureCells({id:'double',kind:'tableDouble',position:{x:3,y:3},rotation:0})).toEqual([{x:3,y:3},{x:4,y:3}]);
});
```

- [ ] **Step 2: Verify RED**

Run `npx vitest run tests/models3d.test.ts tests/coordinates3d.test.ts`.
Expected: FAIL because `tableDouble` has no wide model.

- [ ] **Step 3: Implement models and pointer modes**

Create a double table model 1.84 units wide, positioned halfway between its two cells. Keep single-table geometry unchanged. Replace `setPlantMode` with generic placement mode while preserving a compatible wrapper if needed by main. On pointer selection call `placeFurniture` for furniture or `moveDoor` for door mode; invalid choices keep the mode active and charge nothing. Show a callback reason in the HUD. Cancel clears the mode without a command.

Add a reusable tile-highlight group of thin green/red boxes; create highlights once and toggle positions/visibility per pointer move. Border-only highlighting applies in door mode. Never recreate actor meshes per frame.

- [ ] **Step 4: Rebuild shell after expansion and door movement**

Track `shellWidth/shellHeight`; when dimensions differ remove and dispose only the shell, then create the new shell. Track the door position and replace only its model after relocation. Existing furniture and actor positions remain untouched.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build`.
Expected: all tests PASS.

```bash
git add src tests
git commit -m "feat: place furniture and expand 3D restaurant"
```

---

### Task 5: End-to-end shop workflows and final observation

**Files:**
- Create: `e2e/shop.spec.ts`
- Modify: `e2e/ai.spec.ts`, `e2e/restaurant.spec.ts`

**Interfaces:**
- Consumes all public buttons and placement callbacks from Tasks 1–4.

- [ ] **Step 1: Add browser scenarios**

Start a new game, buy the waiter and counter, place them where required, then verify a completed order and balance increase. Separately buy a 100-coin single table, 200-coin double table and 75-coin chair; assert exact resulting balance and visible canvas. Test occupied-cell rejection and cancellation without charge. Relocate the door for 100 and reload to verify persistence. Use condition-based HUD assertions, not fixed sleeps.

- [ ] **Step 2: Verify mobile and errors**

At 390×844 open and close the shop, verify panel and buttons fit the viewport, buy a chair, cancel placement and return to the menu. Collect console errors, page errors and HTTP responses ≥400 and expect empty lists.

- [ ] **Step 3: Run and capture**

Run `npm run test:e2e`.
Expected: all Playwright tests PASS. Capture desktop/mobile shop, single/double table placement and active service in `artifacts/`; check file sizes before reading images.

- [ ] **Step 4: Correct observed visual defects only**

Inspect screenshots for clipping, overlap, wrong table footprint and stale door/shell. If a defect appears, add a failing regression test where practical, make a targeted correction, and rerun the affected browser scenario.

- [ ] **Step 5: Final verification and commit**

Run `npm test && npm run build && npm run test:e2e && git status --short`.
Expected: all tests PASS, build succeeds, no dev server remains and only intended uncommitted files are shown.

```bash
git add src tests e2e
git commit -m "test: verify restaurant shop and rating workflows"
git status --short
```
