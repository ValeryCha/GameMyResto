# Movement, Camera, Rating and Test Funds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double movement only, add camera zoom and rating-driven visits, provide temporary funds and a three-second quest toast.

**Architecture:** Keep one-second simulation ticks and wrap movement calls in a two-step helper. Keep zoom local to `RestaurantWorld`, add a standalone shop command, and detect newly completed quest IDs in the existing quest UI.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Global Constraints

- Do not accelerate cooking, eating, patience or other timers.
- Preserve collision-safe routing, saves, mobile layout and existing game systems.
- Zoom range is 0.7–1.8 with 0.1 steps.
- Visit interval is `Math.max(8, Math.round(32 - 0.24 * popularity))`.
- The test button grants 50,000 coins per click without limits.
- New quest completion toast hides after 3 seconds.

### Task 1: Movement and Visit Interval

**Files:** `src/simulation/movement.ts`, `src/simulation/tick.ts`, `tests/movement.test.ts`, `tests/tick.test.ts`

**Interfaces:** Add `moveActor(state, actor, target): MoveResult`; it calls `moveToward` at most twice and returns immediately on `arrived` or `blocked`.

- [ ] Add a failing test proving two free cells are crossed in one call and a two-cell-away target ends in `arrived`.
- [ ] Add failing interval assertions: popularity 0/10/50/100 produces spawns at 32/30/20/8 ticks respectively, using a fresh state with no tables and `guestLimit = 2`.
- [ ] Run `npx vitest run tests/movement.test.ts tests/tick.test.ts`; verify the new assertions fail.
- [ ] Implement `moveActor` and replace only movement call sites in `tick.ts`; keep lifecycle decisions unchanged.
- [ ] Extract `customerSpawnInterval(state)` and use it in `advanceSimulation`.
- [ ] Run focused tests, then commit `feat: double movement and scale visits by rating`.

### Task 2: Camera Zoom

**Files:** `src/render3d/RestaurantWorld.ts`, `src/render3d/RestaurantWorld.css` or `src/ui/styles.css`, `e2e/restaurant.spec.ts`

**Interfaces:** Add public `zoomIn(): void` and `zoomOut(): void`; private `zoom = 1`; `resize()` divides the current orthographic view by `zoom`.

- [ ] Add a browser assertion that `+` and `−` controls exist and that wheel input does not produce page errors.
- [ ] Run the browser test and verify missing controls fail.
- [ ] Create a camera-controls container in the world, add buttons with accessible names `Приблизить камеру` and `Отдалить камеру`, call the public methods, and stop pointer propagation.
- [ ] Add wheel handling with `preventDefault()`, clamp zoom to 0.7–1.8, call `resize()`, and remove listeners/controls in `dispose()`.
- [ ] Run build and browser tests; inspect desktop/mobile screenshots.
- [ ] Commit `feat: add camera zoom controls`.

### Task 3: Temporary Test Funds

**Files:** `src/simulation/shop.ts`, `src/ui/shopPanel.ts`, `src/main.ts`, `tests/shop.test.ts`, `e2e/shop.spec.ts`

**Interfaces:** Add `addTestFunds(state): void`; add `ShopCallbacks.onTestFunds(): void`.

- [ ] Write a failing unit test: coins increase by exactly 50,000 while experience and popularity remain unchanged.
- [ ] Run it and verify failure because the function is absent.
- [ ] Implement the command, a category `Для тестирования`, a button with text `+50 000 монет`, and a callback that saves state.
- [ ] Exclude the test button from ordinary affordability disabling; it remains enabled at any balance.
- [ ] Add a browser check for HUD, menu balance and reload persistence.
- [ ] Run focused tests and commit `feat: add temporary test funds button`.

### Task 4: Three-Second Quest Toast

**Files:** `src/ui/questPanel.ts`, `src/ui/questPanel.css`, `tests/questPanel.test.ts`, `e2e/ai.spec.ts`

**Interfaces:** Quest panel tracks known completed IDs, initializes them on first update, shows a toast only for subsequently added IDs, and cancels its timer in `setVisible(false)`.

- [ ] With Vitest fake timers and a JSDOM-compatible existing test setup, add failing tests: no toast on initial load; a newly completed ID shows `Задание выполнено`; 2,999 ms leaves it visible and 3,000 ms hides it.
- [ ] Run the test and verify the toast assertions fail.
- [ ] Implement the toast and timeout, reusing the active toast for a newly completed quest and resetting the three-second deadline.
- [ ] Add a browser assertion after the first quest payment, then wait for disappearance without slowing other assertions unnecessarily.
- [ ] Run focused tests and commit `feat: auto-hide quest completion toast`.

### Task 5: Full Verification

- [ ] Run `npm test && npm run build && npm run test:e2e`.
- [ ] Inspect desktop/mobile screenshots for camera controls, shop, toast and HUD overlap.
- [ ] Confirm no dev server remains running and commit only intended source/tests/docs; leave requirement copies untracked.
