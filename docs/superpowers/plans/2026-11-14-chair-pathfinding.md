# Chair Pathfinding and Debug Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make free chairs traversable while preserving actor collision and the complete guest lifecycle, and remove the `D` debug interface.

**Architecture:** Keep static furniture rules in `grid.ts` and dynamic actor occupancy in `movement.ts`. Make the minimal chair exception, remove the now-unneeded target exception at the seating call site, then delete the debug module and rewrite affected browser assertions around normal game state.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Global Constraints

- Tables, counters, walls and the door remain obstacles; free chairs are traversable.
- A chair occupied by an actor is blocked by the existing next-cell actor check.
- Preserve `seated` → `ordering` → `waitingFood` → `eating` → payment → `leaving`.
- Do not change save formats, prices, rewards, ratings, patience, furniture types or game systems.
- Keep all work in the current project and do not use subagents.
- Run final unit, build and browser checks; stop temporary servers afterward.

---

### Task 1: Chair Traversal and Collision Regression Tests

**Files:**
- Modify: `tests/grid.test.ts`
- Modify: `src/simulation/grid.ts`
- Modify: `tests/movement.test.ts`
- Modify: `src/simulation/tick.ts:132-134`
- Test: `tests/seating.test.ts`, `tests/tick.test.ts`

**Interfaces:**
- Consumes: `isWalkable(state, point)`, `findPath(state, from, to)`, `moveToward(state, actor, target, allowFurnitureTarget?)`.
- Produces: Static chair cells return `true` from `isWalkable`; actor-occupied cells still return `blocked` from `moveToward`.

- [ ] **Step 1: Write failing grid tests**

Append inside `describe('grid', ...)` in `tests/grid.test.ts`:

```ts
it('allows paths through free chairs but not tables or the counter', () => {
  const state = createGame();
  state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 4, y: 6 }, rotation: 0 });
  state.furniture.find((item) => item.id === 'chair-1')!.position = { x: 3, y: 3 };
  expect(isWalkable(state, { x: 3, y: 3 })).toBe(true);
  expect(isWalkable(state, { x: 5, y: 4 })).toBe(false);
  expect(isWalkable(state, { x: 4, y: 6 })).toBe(false);
  expect(isWalkable(state, { x: 0, y: 7 })).toBe(false);
  const path = findPath(state, { x: 3, y: 4 }, { x: 3, y: 2 });
  expect(path).toContainEqual({ x: 3, y: 3 });
  expect(path.at(-1)).toEqual({ x: 3, y: 2 });
});
```

The start and target force the shortest route through the relocated `chair-1` at `(3,3)` without crossing any other furniture.

- [ ] **Step 2: Run the grid test and verify the failure**

Run: `npm test -- --run tests/grid.test.ts`

Expected: FAIL because `isWalkable(state, { x: 5, y: 5 })` is currently `false` and the route avoids the chair.

- [ ] **Step 3: Implement the minimal static chair exception**

In `src/simulation/grid.ts`, change only the furniture predicate:

```ts
export function isWalkable(state: GameState, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < state.width && point.y < state.height &&
    !state.furniture.some((item) => item.kind !== 'chair' &&
      furnitureCells(item).some((cell) => samePoint(cell, point)));
}
```

- [ ] **Step 4: Add the occupied-chair regression test**

Append inside `describe('безопасное перемещение', ...)` in `tests/movement.test.ts`:

```ts
it('блокирует стул, занятый другим гостем', () => {
  const state = createGame();
  const actor: Customer = { id: 'arriving', position: { x: 5, y: 6 }, state: 'seekingSeat', patience: 300 };
  state.customers.push(
    actor,
    { id: 'sitting', position: { x: 5, y: 5 }, state: 'seated', patience: 300, seatId: 'chair-1' },
  );
  expect(moveToward(state, actor, { x: 5, y: 5 })).toBe('blocked');
  expect(actor.position).toEqual({ x: 5, y: 6 });
});
```

- [ ] **Step 5: Remove the obsolete seating exception and run focused tests**

In `src/simulation/tick.ts`, change:

```ts
const movement = moveToward(state, guest, guest.target, true);
```

to:

```ts
const movement = moveToward(state, guest, guest.target);
```

Run: `npm test -- --run tests/grid.test.ts tests/movement.test.ts tests/seating.test.ts tests/tick.test.ts`

Expected: all focused tests PASS, including existing seating and full-lifecycle tests.

- [ ] **Step 6: Commit the navigation change**

```bash
git add src/simulation/grid.ts src/simulation/tick.ts tests/grid.test.ts tests/movement.test.ts
git commit -m "fix: allow movement through free chairs"
```

### Task 2: Remove Debug UI and Preserve Browser Coverage

**Files:**
- Delete: `src/ui/debugPanel.ts`
- Delete: `src/ui/debugPanel.css`
- Modify: `src/main.ts`
- Modify: `e2e/ai.spec.ts`
- Modify: `e2e/progression.spec.ts`

**Interfaces:**
- Consumes: existing `LocalStorageAdapter`, main-menu save on return, HUD and mobile controls.
- Produces: no debug DOM or `KeyD` handler; browser tests assert ordinary gameplay, saving and responsive UI.

- [ ] **Step 1: Rewrite the AI browser test without debug selectors**

In `e2e/ai.spec.ts`, remove lines that open/read `Состояние гостей`. Replace that block with a normal seating screenshot followed by the existing payment assertion:

```ts
await expect(page.getByTestId('restaurant-canvas')).toBeVisible();
await page.screenshot({ path: 'artifacts/restaurant-guest-seated.png' });
await expect(hud).toContainText('Монеты: 605', { timeout: 65_000 });
```

After the existing final gameplay assertion, verify no debug surface exists:

```ts
await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
await page.keyboard.press('KeyD');
await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
```

- [ ] **Step 2: Rewrite the mobile progression check**

Replace the debug-button lines in `e2e/progression.spec.ts` with:

```ts
await page.setViewportSize({ width: 390, height: 844 });
await expect(page.getByRole('button', { name: 'Магазин', exact: true })).toBeInViewport();
await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
await page.screenshot({ path: 'artifacts/restaurant-progression-mobile.png' });
```

- [ ] **Step 3: Run browser tests and verify the expected failures**

Run: `npm run test:e2e`

Expected: FAIL because the debug button/panel still exist.

- [ ] **Step 4: Delete the debug implementation and wiring**

Delete `src/ui/debugPanel.ts` and `src/ui/debugPanel.css`.

In `src/main.ts` remove:

```ts
import { createDebugPanel } from './ui/debugPanel';
const debug = createDebugPanel();
debug.setVisible(false);
debug.setVisible(true);
debug.setVisible(false);
```

Remove `debug.update(state)` from the frame callback, leaving:

```ts
onFrame: () => { hud.update(state); shop.update(state); quests.update(state); },
```

No replacement listener or hidden debug API is added.

- [ ] **Step 5: Run unit and browser checks**

Run: `npm test && npm run test:e2e`

Expected: all unit tests and 6 browser tests PASS.

- [ ] **Step 6: Commit the removal**

```bash
git add src/main.ts src/ui/debugPanel.ts src/ui/debugPanel.css e2e/ai.spec.ts e2e/progression.spec.ts
git commit -m "refactor: remove guest debug panel"
```

### Task 3: Full Verification and Visual Review

**Files:**
- Verify only; fix a discovered regression in its owning file with a failing test first.
- Review: `artifacts/restaurant-guest-seated.png`, `artifacts/restaurant-ai-delivered.png`, `artifacts/restaurant-progression-mobile.png`

**Interfaces:**
- Consumes: all preceding tasks and the unchanged local save schema.
- Produces: verified production build and desktop/mobile screenshots.

- [ ] **Step 1: Run the complete verification suite**

Run: `npm test && npm run build && npm run test:e2e`

Expected: all unit tests PASS, TypeScript/Vite build succeeds, all 6 browser tests PASS.

- [ ] **Step 2: Inspect desktop and mobile screenshots**

Open the three artifacts listed above. Confirm the restaurant, actors, patience indicators and HUD remain visible; no debug button or panel appears; mobile controls fit at 390×844.

- [ ] **Step 3: Check the repository and stop validation processes**

Run: `git status --short`

Expected: only the pre-existing untracked requirement copies `docs/senior-game-dev-latest.txt` and `docs/senior-game-dev-next.txt` remain. Do not add them. Ensure no temporary dev server remains running; Playwright's managed server must be stopped by its test runner.
