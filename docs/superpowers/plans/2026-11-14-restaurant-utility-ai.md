# Restaurant Utility AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give guests and staff deterministic utility-driven behavior, robust routes, complete order delivery and expressive 3D movement on the existing 8×8 grid.

**Architecture:** Pure simulation modules score actions and advance state once per second. Three.js only mirrors state, interpolating actor positions and animating named joints. Save migration supplies missing fields without changing envelope schema.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, localStorage.

## Global Constraints

- Grid remains 8×8; future expansion is exactly +2×+2 but is not implemented here.
- Seat-search patience is 300 seconds; food patience is 120 seconds; unhappy departure costs 1 popularity, clamped at 0.
- No teleporting when a path fails and no duplicate seat/order claims.
- No paid assets, external services or independent browser timers.

---

### Task 1: State, seeded decisions and safe movement

**Files:**
- Create: `src/simulation/random.ts`, `src/simulation/movement.ts`, `src/simulation/ai.ts`
- Modify: `src/simulation/types.ts`, `src/simulation/createGame.ts`, `src/persistence/localStorageAdapter.ts`
- Test: `tests/ai.test.ts`, `tests/movement.test.ts`, `tests/storage.test.ts`

**Interfaces:**
- `nextRandom(state): number`; `moveToward(state, actor, target): 'arrived'|'moving'|'blocked'`; `chooseGuestAction(state, guest): GuestAction`; `normalizeState(state): GameState`.

- [ ] **Step 1: Write failing tests**

```ts
it('повторяет последовательность по seed', () => {
  const a = createGame(), b = createGame();
  expect([nextRandom(a), nextRandom(a)]).toEqual([nextRandom(b), nextRandom(b)]);
});
it('не телепортирует при заблокированной цели', () => {
  const state = createGame();
  const actor = state.customers[0] = { id:'g', position:{x:0,y:6}, state:'seekingSeat', patience:300 };
  state.furniture.push({ id:'wall',kind:'plant',position:{x:0,y:5},rotation:0 });
  const result = moveToward(state, actor, {x:0,y:5});
  expect(result).toBe('blocked'); expect(actor.position).toEqual({x:0,y:6});
});
it('старое сохранение получает новые поля без потери монет', () => {
  const legacy = createGame() as Partial<GameState>; delete legacy.randomSeed; legacy.coins = 777;
  expect(normalizeState(legacy as GameState).coins).toBe(777);
  expect(normalizeState(legacy as GameState).guestLimit).toBe(7);
});
```

- [ ] **Step 2: Run and confirm failure**

Run `npm test -- --run tests/ai.test.ts tests/movement.test.ts tests/storage.test.ts`; expected missing modules/method failure.

- [ ] **Step 3: Implement deterministic random and action scoring**

`nextRandom` uses `state.randomSeed = (state.randomSeed * 1664525 + 1013904223) >>> 0` and returns seed/2³². Guest action union is `'seat'|'wander'|'inspect'|'order'|'eat'|'leave'`. Score leave `Infinity` at patience 0, seat `100 + patience/10` when a free seat exists, order/eat `200` in their phases, inspect `30 + random*20` when furniture exists, wander `20 + random*20`. Tests assert no-seat actions are only wander/inspect and no duplicate reservations.

- [ ] **Step 4: Implement movement and state contracts**

`moveToward` accepts `{position: Point}` and an explicit target, returns arrived at target, otherwise calls existing `findPath`; take only `path[0]`, return blocked for empty path. Add `randomSeed`, `guestLimit`, customer `seatId`, `actionUntil`, `foodWait`, employee `taskId`, furniture `counter`, and order `dishId`, `assignedTo`. Keep `version:1` and `schema:1`. `createGame` starts with seed 123456789, guestLimit 7 and a counter at `{x:2,y:1}`. `normalizeState` fills missing fields and returns the same object; adapter calls it after parsing both keys.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build`; expected new and existing tests PASS except old tick assertions may be updated in Task 2. Commit `feat: add deterministic utility decisions and safe movement` only with green suite.

---

### Task 2: Full guest and employee lifecycle

**Files:**
- Create: `src/content/dishes.ts`
- Modify: `src/simulation/tick.ts`, `src/simulation/ai.ts`, `src/simulation/types.ts`
- Test: `tests/tick.test.ts`, `tests/ai.test.ts`

**Interfaces:**
- `DISHES` has three `{id,name,price,cookSeconds}` entries. `advanceSimulation(state, steps=1)` remains the only simulation entry point.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it('гость без места уходит через 300 секунд и снижает рейтинг', () => {
  const state = createGame(); state.furniture = state.furniture.filter(f => !['chair','table'].includes(f.kind));
  advanceSimulation(state, 1); expect(state.customers[0].state).toBe('seekingSeat');
  advanceSimulation(state, 299); expect(state.customers).toHaveLength(1);
  advanceSimulation(state, 2); expect(state.customers).toHaveLength(0); expect(state.popularity).toBe(9);
});
it('повар и официант завершают заказ с оплатой', () => {
  const state = createGame(); advanceSimulation(state, 500);
  expect(state.coins).toBeGreaterThan(1000);
  expect(state.experience).toBeGreaterThan(0);
  expect(state.orders.every(o => o.state === 'delivered')).toBe(true);
});
```

Also assert blocked paths never skip cells, two guests do not share `seatId`, and waitingFood at 120 seconds leaves without payment.

- [ ] **Step 2: Run and confirm failure**

Run `npm test -- --run tests/tick.test.ts tests/ai.test.ts`; expected old logic fails patience and delivery tests.

- [ ] **Step 3: Implement dishes and customer phases**

Dishes: soup 35/6, pasta 50/9, cutlet 70/12. Spawn every 30 seconds up to guestLimit at the free cell nearest the door. Reserve a free chair whose table is unreserved; target an adjacent walkable cell, never the furniture cell. No seat → utility wander/inspect, with 1–2 second pause and a new seat check each decision. Decrement seat patience only while seeking/wandering/inspecting; at zero mark leaving, clear reservation and set exit. Decrement foodWait only waitingFood; at zero leave with no coins and popularity −1. Eating lasts 8 seconds, then pay dish price, +10 experience, +0.1 popularity, release seat and leave. Remove customer and order only on arrival at exit.

- [ ] **Step 4: Implement staff phases**

Chef claims oldest waitingCook order, walks to a free cell adjacent to stove, sets cooking and increments progress only there; at dish cookSeconds set waitingDelivery and move it to counter logically. Waiter claims oldest waitingDelivery order, walks to counter-adjacent cell, marks assignedTo, then walks to customer-adjacent cell and sets delivered. Each taskId claim is unique. Employees return to their initial positions when idle. Guest order starts after arriving at the seat. Existing plant command remains unchanged.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build`; expected suite PASS. Commit `feat: complete utility-driven restaurant service`.

---

### Task 3: Expressive 3D actor animation and status

**Files:**
- Modify: `src/render3d/models.ts`, `src/render3d/RestaurantWorld.ts`
- Create: `src/render3d/actors.ts`
- Test: `tests/models3d.test.ts`

**Interfaces:**
- Actor groups expose `userData.joints` with `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `head`; `updateActorVisual(model, actor, time, delta)` animates them. World tracks previous/current positions and patience bars.

- [ ] **Step 1: Add failing model assertions**

Assert actor `userData.joints` contains all five Object3D joints and waiter/chef item anchors exist. Run `npm test -- --run tests/models3d.test.ts`; expected FAIL before model changes.

- [ ] **Step 2: Implement model joints and props**

Put each arm/leg cylinder inside a pivot Group at shoulder/hip, retain cylinder geometry, name pivots and store references. Head is a group containing face/hair. Add hidden plate to waiter and pan to chef; expose `carrying` and `cooking` anchors in userData.

- [ ] **Step 3: Implement visual animation**

`updateActorVisual` detects movement from world interpolation and swings arms/legs with sine in opposite phases, adds body bob ≤0.04, turns head ≤0.35 radians toward current interest/direction, damps to zero at rest. Pan rotates while assigned chef order is cooking; plate is visible while waiter has claimed a waitingDelivery order. Patience bar uses two boxes above customers, colored green >0.5, yellow >0.2, red otherwise and scaled by remaining fraction; hide while eating/leaving.

- [ ] **Step 4: Interpolate in RestaurantWorld**

Store per actor `from`, `to`, `startedAt`; on cell change set from to current rendered position and to new grid world position. Render smoothstep over 450ms; update visual joints every frame. Keep simulation one-second cadence. Do not recreate meshes every frame.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build && npm run test:e2e`; expected all PASS. Commit `feat: animate restaurant actors and patience`.

---

### Task 4: Browser observation and visual correction

**Files:**
- Modify: `e2e/restaurant.spec.ts`, `e2e/ai.spec.ts`
- Optional targeted visual fixes in the modules above.

- [ ] **Step 1: Observe several phases**

In Chromium start from menu, capture early guest, wandering/waiting state and a delivered order; assert HUD guests and eventual balance increase with a generous condition-based timeout. Do not use arbitrary sleeps as the only assertion.

- [ ] **Step 2: Check existing flows and mobile**

Verify plant purchase, return to menu, resume, reset cancel/confirm and mobile panel. Capture desktop and mobile 3D views and inspect actual images after checking sizes.

- [ ] **Step 3: Correct one observed visual defect**

Fix actual observed overlap, indicator readability, clipping or animation framing and repeat browser check. No speculative feature additions.

- [ ] **Step 4: Final verification and commit**

Run `npm test && npm run build && npm run test:e2e && git status --short`; expected all PASS and clean tree after commit `test: verify lively restaurant behavior in browser`.
