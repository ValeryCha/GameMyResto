# Core Restaurant Systems Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить категории магазина, улучшения скорости, бонус растений, пульсацию терпения и ежедневную награду без потери существующих сохранений.

**Architecture:** Механики остаются в imperative TypeScript-симуляции; DOM-панель только вызывает команды и отображает состояние. Новые поля нормализуются без смены `version: 1`, существующие команды покупок не меняют семантику.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Global Constraints

- Не переписывать игровой цикл и существующий формат сохранения.
- Не реализовывать ингредиенты, полноценный персонал, санузлы, одежду и формирование меню.
- Не использовать внешние ассеты; иконки — эмодзи.
- Поддержать десктоп и вертикальный мобильный экран.

---

### Task 1: Совместимое состояние и команды магазина

**Files:**
- Modify: `src/simulation/types.ts`
- Modify: `src/simulation/createGame.ts`
- Modify: `src/persistence/normalizeState.ts`
- Modify: `src/simulation/shop.ts`
- Test: `tests/storage.test.ts`, `tests/shop.test.ts`

**Interfaces:**
- Produces: `GameState.upgrades: { cooking: number; waiter: number }`, `GameState.lastDailyReward: string`.
- Produces: `buyCookingUpgrade(state): CommandResult`, `buyWaiterUpgrade(state): CommandResult`, `claimDailyReward(state, date): CommandResult`.

- [ ] **Step 1: Write failing tests**

```ts
it('normalizes legacy upgrades and daily reward', () => {
  const state = createGame();
  delete (state as Partial<GameState>).upgrades;
  delete (state as Partial<GameState>).lastDailyReward;
  normalizeState(state);
  expect(state.upgrades).toEqual({ cooking: 0, waiter: 0 });
  expect(state.lastDailyReward).toBe('');
});

it('applies level gates, prices and daily reward once', () => {
  const state = createGame();
  state.coins = 10000;
  expect(buyCookingUpgrade(state).ok).toBe(false);
  state.level = 2;
  expect(buyCookingUpgrade(state).ok).toBe(true);
  expect(state.coins).toBe(9700);
  expect(claimDailyReward(state, '2026-11-15').ok).toBe(true);
  expect(state.coins).toBe(9800);
  expect(claimDailyReward(state, '2026-11-15').ok).toBe(false);
  expect(state.coins).toBe(9800);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/storage.test.ts tests/shop.test.ts`
Expected: FAIL because new fields/functions are absent.

- [ ] **Step 3: Implement compatible state and commands**

```ts
upgrades: { cooking: 0, waiter: 0 },
lastDailyReward: '',
```

```ts
state.upgrades ??= { cooking: 0, waiter: 0 };
state.upgrades.cooking = Math.max(0, Math.min(2, Math.floor(state.upgrades.cooking ?? 0)));
state.upgrades.waiter = Math.max(0, Math.min(2, Math.floor(state.upgrades.waiter ?? 0)));
state.lastDailyReward ??= '';
```

Upgrade prices are cooking `[300, 600]` from level 2 and waiter `[250, 500]` from level 3. Reject max level, locked purchases and insufficient funds without mutation. Daily reward is `100 + 50 * (state.level - 1)` and succeeds only when `lastDailyReward !== date`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/storage.test.ts tests/shop.test.ts`
Expected: PASS.

### Task 2: Скорость, декор и терпение

**Files:**
- Modify: `src/simulation/movement.ts`
- Modify: `src/simulation/tick.ts`
- Modify: `src/render3d/actors.ts`
- Test: `tests/tick.test.ts`, `tests/movement.test.ts`, `tests/actors3d.test.ts`

**Interfaces:**
- Consumes: `GameState.upgrades` and plant furniture from Task 1.
- Produces: `moveActor(state, actor, target, steps = 2)`; `patienceBonus(state)` capped at `0.5`.

- [ ] **Step 1: Write failing behavior tests**

```ts
expect(moveActor(state, waiter, target, 3)).toBe('arrived');
state.upgrades.cooking = 1;
advanceSimulation(state);
expect(order.progress).toBe(1.2);
state.furniture.push({ id: 'p1', kind: 'plant', position: { x: 3, y: 3 }, rotation: 0 });
advanceSimulation(state);
expect(state.customers[0].foodWait).toBe(132);
```

Add a visual test asserting ring scale is `1 + 0.08 * sin(time * 6)` at patience `0.2` and returns to `1` when hidden or above the threshold.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/movement.test.ts tests/tick.test.ts tests/actors3d.test.ts`
Expected: FAIL on new speed/bonus/pulse behavior.

- [ ] **Step 3: Implement minimal mechanics**

Loop `moveToward` up to `steps`, stopping unless the previous result is `moving`. Waiters call it with `2 + state.upgrades.waiter`; chef progress adds `1 + 0.2 * state.upgrades.cooking`. Spawn and ordering use `120 * (1 + patienceBonus(state))`, and initial patience uses `300 * (1 + patienceBonus(state))`. Ring pulse applies only at fraction `<= 0.2`; otherwise reset scale to `(1,1,1)`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/movement.test.ts tests/tick.test.ts tests/actors3d.test.ts`
Expected: PASS.

### Task 3: Категории, иконки и ежедневная кнопка

**Files:**
- Modify: `src/ui/shopPanel.ts`
- Modify: `src/ui/shopPanel.css`
- Modify: `src/main.ts`
- Test: `tests/shopPanel.test.ts`

**Interfaces:**
- Consumes: commands from Task 1 and state selectors from Tasks 1–2.
- Produces: shop callbacks `onCookingUpgrade`, `onWaiterUpgrade`, `onDailyReward`; category icons and accessible lock/max labels.

- [ ] **Step 1: Write failing DOM tests**

```ts
expect(root.querySelector('[data-shop-item="cookingUpgrade"]')).not.toBeNull();
expect(root.textContent).toContain('Кухня');
expect(root.textContent).toContain('Зал');
expect(root.textContent).toContain('Персонал');
expect(root.textContent).toContain('Нужен 2 уровень');
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/shopPanel.test.ts`
Expected: FAIL because category/item markup is absent.

- [ ] **Step 3: Implement panel and wiring**

Use categories `🍳 Кухня`, `🪴 Зал`, `🧑‍🍳 Персонал`; map existing items without changing their commands. Add `⚡ Ускорение кухни`, `👟 Тренировка официанта` and `🎁 Ежедневная награда`. Buttons expose current price/upgrade level and disable when locked, maxed, unaffordable or already claimed. Wire callbacks to simulation commands, save and refresh through existing `main.ts` flow.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- tests/shopPanel.test.ts && npm run build`
Expected: PASS and successful production build.

### Task 4: Полная проверка и roadmap

**Files:**
- Modify: `docs/roadmap.md` only if implemented items are still listed incorrectly.
- Test: existing Playwright scenarios and desktop/mobile visual states.

- [ ] **Step 1: Run full automated suite**

Run: `npm test && npm run test:e2e`
Expected: all tests PASS.

- [ ] **Step 2: Verify real browser states**

Run the Vite server temporarily, open the game in Chromium, exercise category purchases, level locks, daily reward and existing editor/progress controls. Capture desktop and mobile screenshots, inspect them, correct any concrete visual defect and repeat. Confirm zero console errors and no failed resources.

- [ ] **Step 3: Stop temporary server and deliver preview**

Confirm no development server remains running. Deliver the project preview card with root `C:\KimiProject\Мини игра` and `http://localhost:7100/`.
