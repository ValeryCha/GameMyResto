# Restaurant Seating, Progression and Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair actual chair seating, add level-driven dishes and quests, and introduce safe furniture editing without resetting existing saves.

**Architecture:** Keep pure simulation commands separate from Three.js and DOM. A seating helper resolves current table/chair pairs; progression processes discrete events; the editor pauses simulation and reuses the same occupancy functions as purchasing.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, localStorage.

## Global Constraints

- Start grid 8×8; every paid or level expansion adds exactly 2×2.
- Seat search is 300 seconds; food wait is 120 seconds.
- Starter soup costs 5; quest rewards are `30 × level` XP and `100 × level²` coins.
- Paid expansion costs 50 000; guest limit +1 costs 600.
- No external assets, new framework, paid service, or save reset.
- All user-facing text is Russian; identifiers and code are English.
- No subagents; implement inline with tests before each component.

---

### Task 1: Current Furniture Seating

**Files:**
- Create: `src/simulation/seating.ts`
- Modify: `src/simulation/types.ts`, `src/simulation/tick.ts`, `src/simulation/grid.ts`
- Test: `tests/seating.test.ts`, `tests/ai.test.ts`

**Interfaces:**
- Produces: `findSeat(state, guest): { chair: Furniture; table: Furniture } | undefined`, `isSeatCurrent(state, guest): boolean`.
- `CustomerState` adds `seated`; `seatId` remains the chair reservation.

- [ ] Write tests proving a chair must touch a real table, double-table rotations work, reservations exclude other guests, and a guest reaches the chair cell before ordering.
- [ ] Run `npx vitest run tests/seating.test.ts tests/ai.test.ts`; expect failure because `seating.ts` and `seated` do not exist.
- [ ] Implement `findSeat` by scanning unreserved chairs and `furnitureCells(table)` with Manhattan adjacency. Implement `isSeatCurrent` against current furniture.
- [ ] Replace `freeSeat`/`reserveSeat` with `findSeat`. Set `target = chair.position`; on arrival require exact `samePoint`, then set `seated`; only on the next tick create an order.
- [ ] Revalidate a reservation every seeking tick. Clear invalid targets and return to `seekingSeat`; retain 300-second patience and existing wandering.
- [ ] Run the same tests and `npm test`; expect PASS.
- [ ] Commit `fix: seat guests on current table chairs`.

### Task 2: Seated 3D Pose and Clear Patience Ring

**Files:**
- Modify: `src/render3d/models.ts`, `src/render3d/actors.ts`, `src/render3d/RestaurantWorld.ts`
- Create: `src/ui/debugPanel.ts`, `src/ui/debugPanel.css`
- Modify: `src/main.ts`
- Test: `tests/actors3d.test.ts`, `tests/models3d.test.ts`

**Interfaces:**
- Consumes: exact `guest.position`, `guest.state`, `guest.patience`.
- Produces: `createDebugPanel(): { update(state), toggle(), setVisible(boolean) }`.

- [ ] Add failing model tests: patience bar objects are absent, a floor ring exists, and seated pose lowers the body and bends legs.
- [ ] Run `npx vitest run tests/actors3d.test.ts tests/models3d.test.ts`; expect FAIL on the new objects/pose.
- [ ] Replace bar meshes with a thin `THREE.RingGeometry` lying on the floor. Update ring color and draw fraction from patience; hide it for eating/leaving.
- [ ] In `updateActorVisual`, accept `seated?: boolean`; interpolate body Y down and leg rotations into a sitting pose, with no walking swing.
- [ ] Add the D keyboard listener and a visible mobile/desktop `D` button. Panel rows show ID, state, position, target, seatId and orderId.
- [ ] Run unit tests and build; expect PASS.
- [ ] Commit `feat: clarify guest state and patience visuals`.

### Task 3: Progression State and Dish Unlocks

**Files:**
- Create: `src/simulation/progression.ts`, `src/content/quests.ts`
- Modify: `src/content/dishes.ts`, `src/simulation/types.ts`, `src/simulation/createGame.ts`, `src/persistence/normalizeState.ts`, `src/simulation/tick.ts`
- Test: `tests/progression.test.ts`, `tests/storage.test.ts`, `tests/tick.test.ts`

**Interfaces:**
- Produces: `processProgression(state): void`, `availableDishes(state): Dish[]`, `experienceThreshold(level): number`.
- Adds `level`, `completedQuestIds`, `unlockedDishIds`, `servedTotal`, `paidExpansions`.

- [ ] Write failing tests for threshold 100/300/600, multiple level-ups, free +2×2, level cap 30, soup-only level 1, and save normalization.
- [ ] Run `npx vitest run tests/progression.test.ts tests/storage.test.ts`; expect missing exports/fields.
- [ ] Implement thresholds as `50 * level * (level + 1)` and a while loop which expands on every gained level. Keep object coordinates unchanged.
- [ ] Define six dishes with `unlockLevel` 1/2/4/6/8/10 and prices 5/7/12/20/35/50. Filter random ordering through `availableDishes`; finish old orders by ID regardless of availability.
- [ ] Normalize all new fields and deduplicate IDs; derive level from existing XP without charging coins or removing entities.
- [ ] Increment `servedTotal` once on completed eating, then call `processProgression` after events and each simulation tick.
- [ ] Run the focused tests and `npm test`; expect PASS.
- [ ] Commit `feat: add restaurant levels and dish unlocks`.

### Task 4: Ten Quests and Flexible Rewards

**Files:**
- Modify: `src/content/quests.ts`, `src/simulation/progression.ts`, `src/simulation/shop.ts`
- Create: `src/ui/questPanel.ts`, `src/ui/questPanel.css`
- Modify: `src/ui/hud.ts`, `src/main.ts`
- Test: `tests/progression.test.ts`, `tests/shop.test.ts`

**Interfaces:**
- Quest: `{ level, title, description, test(state), unlockDishId? }`.
- Produces current quest display and reward transaction inside `processProgression`.

- [ ] Write one parameterized test per level using the exact conditions: served 1/3/15, chairs 3, rating 20, tables 3, double tables 1, waiters 2, guestLimit 8, paidExpansions 1.
- [ ] Verify rewards exactly `30 * level` XP and `100 * level * level` coins, completion is idempotent, and the specified dish unlocks.
- [ ] Run `npx vitest run tests/progression.test.ts tests/shop.test.ts`; expect FAIL before quest data and rewards.
- [ ] Implement all ten quest definitions and automatic one-time completion. Increment `paidExpansions` only after successful paid expansion; set its price to 50 000 and limit price to 600 in both command and shop catalog.
- [ ] Add HUD `Уровень: N`, `Опыт: current / next`, and a compact current quest card with reward text.
- [ ] Run focused tests, full tests, and build; expect PASS.
- [ ] Commit `feat: add level quests and scaled rewards`.

### Task 5: Atomic Furniture Editing Commands

**Files:**
- Modify: `src/simulation/commands.ts`, `src/simulation/grid.ts`
- Test: `tests/commands.test.ts`, `tests/seating.test.ts`

**Interfaces:**
- Produces `moveFurniture(state, id, position): CommandResult`, `rotateFurniture(state, id): CommandResult`, `removeFurniture(state, id): CommandResult`.
- Editing ignores the selected item during collision checks.

- [ ] Add failing tests for moving to free/occupied cells, rotating a double table horizontally/vertically, edge rejection, 50% floor refund, and protected active-order furniture.
- [ ] Run `npx vitest run tests/commands.test.ts tests/seating.test.ts`; expect missing exports.
- [ ] Implement occupancy using `furnitureCells`, ignoring `id`; rotate by 90 degrees and validate both cells. Reuse catalog prices for refunds.
- [ ] Reject removal of stove/counter needed by active orders and tables/chairs with seated guests or active orders. For walking reservations, clear `seatId`/`target` and set `seekingSeat`.
- [ ] Run focused and full tests; expect PASS.
- [ ] Commit `feat: add safe furniture editing commands`.

### Task 6: Interactive 3D Editor

**Files:**
- Create: `src/ui/editorPanel.ts`, `src/ui/editorPanel.css`
- Modify: `src/main.ts`, `src/render3d/RestaurantWorld.ts`, `src/render3d/models.ts`
- Test: `tests/models3d.test.ts`

**Interfaces:**
- World methods: `setEditorMode(boolean)`, `selectAtPointer`, `moveSelectedTo(point)`, `rotateSelected()`, callbacks `onSelect(id?)`, `onEditEnd()`.
- Editor commands come only from Task 5.

- [ ] Add a failing rotation model test checking double-table geometry follows rotation.
- [ ] Implement raycast selection against furniture entity groups; expose move/rotate/delete actions and a confirmation containing exact refund.
- [ ] Pause simulation while editor mode is active but continue rendering. On exit, revalidate all guest reservations and resume without resetting tick.
- [ ] Make all actions touch-friendly, save each successful edit, and keep cancellation free.
- [ ] Run tests and build; expect PASS.
- [ ] Commit `feat: add interactive furniture editor`.

### Task 7: Browser Regression and Delivery

**Files:**
- Modify: `e2e/ai.spec.ts`, `e2e/restaurant.spec.ts`, `e2e/shop.spec.ts`
- Create: `e2e/progression.spec.ts`, `e2e/editor.spec.ts`

- [ ] Update purchase expectations: limit 600 and expansion 50 000; soup payment is 5 at level 1.
- [ ] Browser-test actual seated state through D, completed payment, quest reward, level expansion, furniture move/rotate/delete, persistence and mobile D/editor controls.
- [ ] Run `npm run test:e2e`; diagnose failures without weakening assertions.
- [ ] Capture desktop/mobile and seated/editor screenshots; check file sizes before visual inspection.
- [ ] Run `npm test && npm run build && npm run test:e2e && git status --short`; expect 0 failures and only intended changes.
- [ ] Commit `test: verify seating progression and furniture editor`.
