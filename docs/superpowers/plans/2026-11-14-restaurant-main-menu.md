# Restaurant Main Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive Russian main menu with safe continue/reset flows and lifecycle controls for the existing 3D game.

**Architecture:** One SPA coordinates DOM screens and a lazily created `RestaurantWorld`. Existing simulation and save envelope stay unchanged; storage gains reset and the world gains idempotent start/stop plus disposal.

**Tech Stack:** TypeScript, DOM/CSS, Three.js, Vitest, Playwright.

## Global Constraints

- No external assets, backend, paid services or rewritten simulation.
- Preserve `moy-restoran:primary` and `moy-restoran:backup` formats.
- New game always requires confirmation; cancel has no side effects.
- Menu is usable at 390×844 and with keyboard focus.

---

### Task 1: Resettable saves and safe world lifecycle

**Files:**
- Modify: `src/persistence/storage.ts`, `src/persistence/localStorageAdapter.ts`, `src/render3d/RestaurantWorld.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Produces `StorageAdapter.reset(): void`; `RestaurantWorld.start()`, `stop()`, `dispose()` are safe on repeated transitions.

- [ ] **Step 1: Add failing reset test**

```ts
it('полностью очищает основной и резервный прогресс', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const adapter = new LocalStorageAdapter(storage);
  const changed = createGame(); changed.coins = 500; adapter.save(changed);
  adapter.reset();
  expect(values.has('moy-restoran:primary')).toBe(false);
  expect(values.has('moy-restoran:backup')).toBe(false);
  expect(adapter.load().coins).toBe(1000);
});
```

- [ ] **Step 2: Verify failure**

Run `npm test -- --run tests/storage.test.ts`; expected FAIL because reset/removeItem are absent.

- [ ] **Step 3: Implement reset**

Add `removeItem(key: string): void` to `KeyValueStorage`, `reset(): void` to `StorageAdapter`, and:

```ts
reset(): void {
  this.storage.removeItem(PRIMARY);
  this.storage.removeItem(BACKUP);
}
```

Update both existing test doubles with `removeItem: (key) => { values.delete(key); }`.

- [ ] **Step 4: Implement lifecycle**

Guard `start()` with `if (this.frameId) return`; set `frameId = 0` in `stop()` after cancellation. `stop()` only stops animation. Add `dispose()` which calls stop, disconnects ResizeObserver, removes pointer listener, traverses scene meshes disposing geometry, disposes renderer and removes its canvas. Do not dispose cached shared materials.

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run build`; expected 16 tests PASS and build PASS. Commit `feat: support new games and safe world lifecycle`.

---

### Task 2: Main menu screens and styles

**Files:**
- Create: `src/ui/mainMenu.ts`, `src/ui/styles.css`
- Test: `e2e/menu.spec.ts`

**Interfaces:**
- Produces `createMainMenu(callbacks: MainMenuCallbacks)` with `show()`, `hide()`, `setBalance(coins: number)`, `showSettings()`, `showAbout()`, `showResetConfirmation()`.

- [ ] **Step 1: Write failing browser test**

```ts
test('главное меню и вспомогательные экраны', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Мой ресторан' })).toBeVisible();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 1000 монет');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Звук' }).uncheck();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Об игре' }).click();
  await expect(page.getByText('Принимайте гостей')).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await expect(page.getByText('Удалить текущий прогресс?')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 1000 монет');
});
```

- [ ] **Step 2: Verify failure**

Run `npx playwright test e2e/menu.spec.ts`; expected FAIL because the game currently opens directly.

- [ ] **Step 3: Implement menu**

`MainMenuCallbacks` defines `onPlay`, `onNewGame`, `onSoundChange(enabled: boolean)`. `createMainMenu` builds four absolutely positioned full-screen panels. The main panel contains a text logo, CSS/SVG façade, balance, and four named buttons. Settings has a labelled checked checkbox initialized from `localStorage.getItem('moy-restoran:sound') !== 'off'`; changes invoke callback. About contains the sentence beginning `Принимайте гостей` and gameplay instructions. Reset confirmation contains `Удалить текущий прогресс?`, `Начать заново` and `Отмена`; only the first invokes `onNewGame`. Every panel has a visible heading and Back where appropriate. `show()` displays main; `hide()` hides every panel.

- [ ] **Step 4: Implement responsive styling**

Import `styles.css` in `main.ts`. Use `box-sizing:border-box`, cream panels, terracotta logo, green primary button, dark brown text, visible `:focus-visible`, `width:min(440px, calc(100vw - 32px))` and vertical buttons. Keep the decorative façade CSS/SVG-only. Media query below 600px reduces logo and padding without hiding controls.

- [ ] **Step 5: Commit UI independently**

Run `npm run build`; expected TypeScript may still need bootstrap integration in Task 3, so do not claim browser PASS yet. Commit `feat: add responsive restaurant menu screens` only after build succeeds or keep files uncommitted for Task 3 if bootstrap imports are required.

---

### Task 3: Integrate menu, game and reset flows

**Files:**
- Modify: `src/main.ts`, `src/ui/hud.ts`, `index.html`
- Test: `e2e/restaurant.spec.ts`, `e2e/menu.spec.ts`

**Interfaces:**
- One active `GameState`, zero or one `RestaurantWorld`, one HUD; menu callbacks control transitions.

- [ ] **Step 1: Extend browser flow**

Before the existing 1000/guest assertions click `Играть`. After plant purchase click `Меню`, expect balance 950, click `Играть`, expect 950. Then return to menu, choose New game and Cancel, assert 950. Repeat and confirm `Начать заново`, expect game HUD 1000. Keep console/page/HTTP error assertions. Add desktop and 390×844 menu screenshots and bounds assertions.

- [ ] **Step 2: Verify failure**

Run `npm run test:e2e`; expected FAIL because integration is absent.

- [ ] **Step 3: Coordinate application state**

```ts
let state = storage.load();
let world: RestaurantWorld | undefined;
let playing = false;
const hud = createHud(() => { /* placement and HUD mode */ }, () => returnToMenu());
const menu = createMainMenu({
  onPlay: play,
  onNewGame: resetGame,
  onSoundChange: enabled => localStorage.setItem('moy-restoran:sound', enabled ? 'on' : 'off'),
});
```

`play()` hides menu, shows HUD/game, creates world only if absent, updates HUD and starts once. `returnToMenu()` saves, stops, sets playing false, hides HUD/game, updates balance and shows menu. `resetGame()` disposes old world, clears container, resets storage, assigns `createGame()`, saves, clears world and calls play. WebGL catch shows the Russian fallback and leaves a working `Меню` control.

- [ ] **Step 4: Add HUD menu button and visibility**

Add second callback `onMenu`; button name exactly `Меню`, class `hud-menu-button`. Return `setVisible(visible: boolean)` and use `root.hidden = !visible`. Initially hide HUD and game container; menu remains visible.

- [ ] **Step 5: Verify visually and functionally**

Run `npm test && npm run build && npm run test:e2e`; expected all PASS. Check sizes then inspect desktop/mobile menu and game screenshots. Correct the observed overlap, clipping, contrast or framing issue and rerun all checks. Ensure Playwright terminates its dev server.

- [ ] **Step 6: Commit**

Commit `feat: connect main menu to 3D restaurant`.
