# Restaurant City Gameplay Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить заполнение ресторана и влияние рейтинга, затем добавить лимит 7→50, 33 уровня и рецепта, желания ×5, задания, внешность и календарь без потери сохранений.

**Architecture:** Чистые вычисления потока, лимитов, рецептов и календаря выносятся в небольшие модули; существующие `advanceSimulation`, Three.js-модели и `LocalStorageAdapter` сохраняются. Новые поля мигрируются в `normalizeState`, а UI подключается к существующим панелям и seeded RNG.

**Tech Stack:** TypeScript 5.9, Three.js, Vitest, Playwright, Vite, HTML/CSS без внешних ассетов.

## Global Constraints

- Рабочий корень: `C:\KimiProject\Мини игра`.
- Не переписывать игровую логику заново; сохранить `schema:1`, `version:1`, ключи primary/backup и старые id.
- Пользовательские тексты и комментарии — на русском; идентификаторы — на английском.
- Не добавлять внешние ассеты и зависимости.
- Не использовать субагентов; не выполнять git commit/push/merge без отдельной просьбы.
- Формулы, названия, цены и миграции берутся из `docs/superpowers/specs/2026-11-15-gameplay-rework-design.md`.

## File Structure

- `src/simulation/guestFlow.ts`: вместимость, интервал, пик, терпение и чаевые.
- `src/simulation/guestLimits.ts`: уровневые и покупные слоты, единый пересчёт лимита.
- `src/simulation/calendar.ts`: даты, серия, ручное получение награды.
- `src/content/dishes.ts`: 33 рецепта и функции цены.
- `src/content/quests.ts`: стабильные id и 33 уровневых задания.
- `src/simulation/types.ts`, `createGame.ts`, `normalizeState.ts`: совместимое состояние.
- `src/simulation/tick.ts`, `shop.ts`, `progression.ts`: команды и симуляция.
- `src/ui/calendarPanel.ts`, `.css`: отдельный календарь.
- `src/ui/hud.ts`, `shopPanel.ts`, `icons.ts`, `styles.css`, `shopPanel.css`: показатели и покупки.
- `src/render3d/models.ts`, `actors.ts`: внешность и желания без изменения физики.
- `src/main.ts`: взаимоисключающие панели и сохранение.
- `tests/*.test.ts`, `e2e/gameplay-rework.spec.ts`: проверки каждого слоя.

---

### Task 1: Вместимость и формула потока

**Files:**
- Create: `src/simulation/guestFlow.ts`, `tests/guestFlow.test.ts`
- Modify: `src/simulation/tick.ts`, `src/simulation/types.ts`, `src/simulation/createGame.ts`

**Interfaces:**
- Produces: `countUsableSeats(state): number`, `targetGuestCount(state): number`, `customerSpawnInterval(state): number`, `isPeakHour(tick): boolean`, `patienceMultiplier(state): number`, `tipMultiplier(state): number`.
- Consumes: существующие `furnitureCells`, `nextRandom`, `advanceSimulation`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { customerSpawnInterval, targetGuestCount, countUsableSeats, isPeakHour } from '../src/simulation/guestFlow';

it.each([[0, 7.14], [25, 6.07], [50, 5], [75, 3.93], [100, 2.86]])(
  'считает интервал для рейтинга %i', (popularity, expected) => {
    const state = createGame();
    state.popularity = popularity;
    expect(customerSpawnInterval(state)).toBeCloseTo(expected, 2);
  });

it('не создаёт фиктивную вместимость без столов', () => {
  const state = createGame();
  expect(countUsableSeats(state)).toBe(1);
  expect(targetGuestCount(state)).toBe(1);
  state.employees.push({ id: 'w1', role: 'waiter', position: { x: 2, y: 2 }, energy: 100 });
  state.employees.push({ id: 'w2', role: 'waiter', position: { x: 2, y: 3 }, energy: 100 });
  expect(targetGuestCount(state)).toBe(3);
  expect(isPeakHour(0)).toBe(true);
  expect(isPeakHour(60)).toBe(false);
  expect(isPeakHour(180)).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/guestFlow.test.ts`  
Expected: FAIL, модуль `guestFlow` отсутствует.

- [ ] **Step 3: Implement pure flow calculations**

```ts
import { furnitureCells } from './grid';
import type { GameState } from './types';

const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

export function countUsableSeats(state: GameState): number {
  return state.furniture.filter((chair) => chair.kind === 'chair' && state.furniture.some((table) =>
    (table.kind === 'table' || table.kind === 'tableDouble') &&
    furnitureCells(table).some((cell) => adjacent(cell, chair.position)))).length;
}

export function targetGuestCount(state: GameState): number {
  const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
  return Math.min(state.guestLimit, Math.max(1, countUsableSeats(state) + Math.min(2, waiters)));
}

export function isPeakHour(tick: number): boolean { return tick % 180 < 60; }

export function customerSpawnInterval(state: GameState): number {
  const rating = state.popularity / 100;
  const level = (state.level - 1) / 32;
  const occupancy = state.customers.length / targetGuestCount(state);
  const chefs = state.employees.filter((employee) => employee.role === 'chef').length;
  const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
  const speed = 0.6 + 0.25 * chefs + 0.2 * waiters + 0.1 * state.upgrades.cooking + 0.1 * state.upgrades.waiter;
  const base = (7.5 - 4.5 * rating) * (1 - 0.35 * level) * (1 + 0.6 * occupancy) / speed;
  return clamp(1.8, 9, base) * (isPeakHour(state.tick) ? 0.75 : 1);
}

export const patienceMultiplier = (state: GameState) => 0.85 + 0.3 * state.popularity / 100;
export const tipMultiplier = (state: GameState) => 1 + 0.2 * state.popularity / 100;
```

Добавить `spawnProgress: number` в `GameState` и `spawnProgress: 0` в `createGame`. В `tick.ts` импортировать функции из `guestFlow`, удалить старую формулу, применять `300 * patienceMultiplier(state) * (1 + patienceBonus(state))`. Планировщик должен накапливать дробный интервал и не спавнить при `customers.length >= targetGuestCount(state)`:

```ts
state.spawnProgress += 1;
const interval = customerSpawnInterval(state);
if (state.tick === 1) spawnCustomer(state);
else if (state.spawnProgress >= interval) {
  if (state.customers.length < targetGuestCount(state)) {
    spawnCustomer(state);
    state.spawnProgress -= interval;
  } else state.spawnProgress = interval;
}
```

- [ ] **Step 4: Verify capacity and regression tests**

Run: `npx vitest run tests/guestFlow.test.ts tests/tick.test.ts tests/seating.test.ts`  
Expected: новые тесты PASS; старые тесты с интервалами 8/20/32 обновляются на утверждённые значения, а не подгоняется формула.

---

### Task 2: Лимит 7→50 и миграция

**Files:**
- Create: `src/simulation/guestLimits.ts`, `tests/guestLimits.test.ts`
- Modify: `src/simulation/types.ts`, `createGame.ts`, `progression.ts`, `shop.ts`, `persistence/normalizeState.ts`

**Interfaces:**
- Produces: `MAX_LEVEL = 33`, `levelGuestLimit(level)`, `recalculateGuestLimit(state)`, `guestSlotPrice(count)`, `buyRecipe(state, dishId)` появится в Task 3.

- [ ] **Step 1: Write failing limit and migration tests**

```ts
it.each([[1, 7], [2, 8], [32, 39], [33, 40]])('лимит уровня %i', (level, expected) => {
  expect(levelGuestLimit(level)).toBe(expected);
});

it('даёт ровно десять покупок до 50 и прогрессивные цены', () => {
  const state = createGame();
  state.level = 33;
  state.coins = 100000;
  recalculateGuestLimit(state);
  for (let i = 0; i < 10; i += 1) expect(increaseGuestLimit(state).ok).toBe(true);
  expect(state.purchasedGuestSlots).toBe(10);
  expect(state.guestLimit).toBe(50);
  expect(increaseGuestLimit(state).ok).toBe(false);
});

it('мигрирует старый лимит один раз', () => {
  const legacy = createGame() as GameState & { purchasedGuestSlots?: number };
  legacy.level = 5;
  legacy.guestLimit = 10;
  delete legacy.purchasedGuestSlots;
  normalizeState(legacy);
  expect(legacy.purchasedGuestSlots).toBe(3);
  expect(legacy.guestLimit).toBe(14);
  normalizeState(legacy);
  expect(legacy.guestLimit).toBe(14);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/guestLimits.test.ts tests/storage.test.ts`  
Expected: FAIL по отсутствующим функциям/полю.

- [ ] **Step 3: Implement limit module and idempotent migration**

```ts
import type { GameState } from './types';
export const MAX_LEVEL = 33;
export const MAX_PURCHASED_SLOTS = 10;
export const levelGuestLimit = (level: number) => 7 + Math.max(0, level - 1) + (level >= 33 ? 1 : 0);
export const guestSlotPrice = (count: number) => 2500 + 500 * count;
export function recalculateGuestLimit(state: GameState): void {
  state.guestLimit = levelGuestLimit(state.level) + state.purchasedGuestSlots;
}
```

В `GameState` добавить `purchasedGuestSlots: number`, в новую игру — 0. В `increaseGuestLimit` проверять `< 10`, списывать `guestSlotPrice(state.purchasedGuestSlots)`, увеличивать счётчик и вызывать пересчёт. В `applyLevels` использовать `MAX_LEVEL`, после повышения вызывать пересчёт. В `normalizeState` до `processProgression`:

```ts
state.purchasedGuestSlots ??= Math.max(0, Math.min(10, (state.guestLimit ?? 7) - 7));
state.purchasedGuestSlots = Math.max(0, Math.min(10, Math.floor(state.purchasedGuestSlots)));
recalculateGuestLimit(state);
```

- [ ] **Step 4: Verify progression and storage**

Run: `npx vitest run tests/guestLimits.test.ts tests/progression.test.ts tests/storage.test.ts tests/shop.test.ts`  
Expected: PASS; максимум 33 и размер после 32 расширений проверены отдельно.

---

### Task 3: 33 рецепта и покупки

**Files:**
- Modify: `src/content/dishes.ts`, `src/simulation/shop.ts`, `src/simulation/progression.ts`
- Create: `tests/dishes.test.ts`

**Interfaces:**
- Produces: `DISHES` длиной 33, `recipeCost(level)`, `dishPrice(level)`, `buyRecipe(state, dishId): CommandResult`, `availableDishes(state)`.

- [ ] **Step 1: Write failing content/economy tests**

```ts
it('содержит ровно 33 уникальных блюда с заданной экономикой', () => {
  expect(DISHES).toHaveLength(33);
  expect(new Set(DISHES.map((dish) => dish.id)).size).toBe(33);
  DISHES.forEach((dish, index) => {
    expect(dish.unlockLevel).toBe(index + 1);
    expect(dish.price).toBe(5 + 2 * index);
  });
  expect(recipeCost(1)).toBe(0);
  expect(recipeCost(2)).toBe(400);
  expect(recipeCost(33)).toBe(16850);
});

it('покупает рецепт только на нужном уровне и один раз', () => {
  const state = createGame();
  expect(buyRecipe(state, 'pasta').reason).toBe('Нужен 2 уровень');
  state.level = 2;
  expect(buyRecipe(state, 'pasta').ok).toBe(true);
  expect(state.coins).toBe(600);
  expect(state.unlockedDishIds).toContain('pasta');
  expect(buyRecipe(state, 'pasta').reason).toBe('Рецепт уже куплен');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/dishes.test.ts`  
Expected: FAIL из-за 6 блюд и отсутствия `buyRecipe`.

- [ ] **Step 3: Add the complete dish catalogue and purchase command**

Сохранить первые шесть id и записать остальные id: `omelet`, `pizza`, `burger`, `dumplings`, `risotto`, `tacos`, `sushi`, `borscht`, `steak`, `paella`, `lasagna`, `khinkali`, `tomYam`, `pekingDuck`, `ramen`, `moussaka`, `ravioli`, `chakhokhbili`, `ratatouille`, `meatballs`, `kebab`, `pilaf`, `fondue`, `salmon`, `veal`, `tastingSet`, `royalBanquet`. Названия и уровни — точная таблица спецификации. Времена готовки циклически 6–15 секунд: `6 + (level - 1) % 10`.

```ts
export const dishPrice = (level: number) => 5 + 2 * (level - 1);
export const recipeCost = (level: number) => level === 1 ? 0 : 50 * Math.round(3 * Math.pow(level, 1.35));
export const DISHES: Dish[] = DISH_NAMES.map(([id, name], index) => ({
  id, name, unlockLevel: index + 1, price: dishPrice(index + 1), cookSeconds: 6 + index % 10,
}));
```

```ts
export function buyRecipe(state: GameState, dishId: string): CommandResult {
  const dish = DISHES.find((item) => item.id === dishId);
  if (!dish) return { ok: false, reason: 'Рецепт не найден' };
  if (state.level < dish.unlockLevel) return { ok: false, reason: `Нужен ${dish.unlockLevel} уровень` };
  if (state.unlockedDishIds.includes(dish.id)) return { ok: false, reason: 'Рецепт уже куплен' };
  const price = recipeCost(dish.unlockLevel);
  if (!spend(state, price, 0)) return insufficient;
  state.unlockedDishIds.push(dish.id);
  return { ok: true };
}
```

- [ ] **Step 4: Verify dish tests and old-save compatibility**

Run: `npx vitest run tests/dishes.test.ts tests/progression.test.ts tests/storage.test.ts`  
Expected: PASS; старые `unlockedDishIds` не перезаписываются и не отзываются.

---

### Task 4: Желания, чаевые и статистика рейтинга

**Files:**
- Modify: `src/simulation/types.ts`, `tick.ts`, `createGame.ts`, `normalizeState.ts`
- Create: `src/simulation/orders.ts`, `tests/desires.test.ts`

**Interfaces:**
- Produces: `chooseOrder(state, guest): Order | undefined`, `settleOrder(state, guest, order): number`, `adjustRating(state, delta): void`.
- Consumes: `nextRandom`, `DISHES`, `tipMultiplier`.

- [ ] **Step 1: Write failing deterministic desire/payment tests**

```ts
it('оставляет шанс желания 10 процентов и заказывает только купленное обычным гостям', () => {
  const state = createGame();
  state.randomSeed = 123456789;
  let desires = 0;
  for (let i = 0; i < 1000; i += 1) {
    const guest: Customer = { id: `g${i}`, position: { x: 0, y: 7 }, state: 'ordering', patience: 300 };
    if (chooseOrder(state, guest)?.desired) desires += 1;
  }
  expect(desires).toBeGreaterThan(70);
  expect(desires).toBeLessThan(130);
});

it('не создаёт заказ на некупленное желание и снимает 1 рейтинг', () => {
  const state = createGame();
  state.level = 2;
  const guest: Customer = { id: 'wish', position: { x: 5, y: 5 }, state: 'ordering', patience: 300, hasDesire: true, desiredDishId: 'pasta' };
  expect(createDesiredOrder(state, guest)).toBeUndefined();
  expect(state.popularity).toBe(9);
  expect(guest.state).toBe('leaving');
});

it('платит пятикратно и добавляет чаевые рейтинга', () => {
  const state = createGame();
  state.popularity = 100;
  expect(paymentFor(state, DISHES[0], true)).toBe(30);
  expect(paymentFor(state, DISHES[0], false)).toBe(6);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/desires.test.ts`  
Expected: FAIL по отсутствующему модулю заказов.

- [ ] **Step 3: Implement order selection and settlement**

В `Customer` добавить:

```ts
hasDesire: boolean;
desiredDishId?: string;
bodyType: 'masculine' | 'feminine';
hairStyle: 'short' | 'long' | 'bun' | 'ponytail' | 'curly';
hairColor: number;
skinColor: number;
outfitColor: number;
```

В `GameState`: `revenueTotal`, `satisfiedStreak`, `desiredServedTotal`, `unhappyTotal` (все number, старт 0). В `Order` добавить `desired: boolean`.

```ts
export const paymentFor = (state: GameState, dish: Dish, desired: boolean) =>
  Math.round(dish.price * (desired ? 5 : 1) * tipMultiplier(state));

export function settleOrder(state: GameState, guest: Customer, order: Order): number {
  const dish = DISHES.find((item) => item.id === order.dishId) ?? DISHES[0];
  const revenue = paymentFor(state, dish, order.desired);
  state.coins += revenue;
  state.revenueTotal += revenue;
  state.experience += 10;
  state.servedTotal += 1;
  state.satisfiedStreak += 1;
  if (order.desired) state.desiredServedTotal += 1;
  state.popularity = Math.min(100, state.popularity + 0.1);
  guest.state = 'leaving';
  return revenue;
}
```

`chooseOrder` использует один вызов RNG для проверки `< 0.1`, затем выбирает желаемое среди `DISHES.filter(d => d.unlockLevel <= state.level)`. Вес дорогого блюда: `1 + rating * index / 32`, где `rating = popularity / 100`; обычный заказ выбирает только `availableDishes`. Некупленное желание вызывает общий `unhappyExit`, инкремент `unhappyTotal`, сброс `satisfiedStreak`, −1 рейтинга и не создаёт `Order`.

- [ ] **Step 4: Verify simulation and deterministic saves**

Run: `npx vitest run tests/desires.test.ts tests/tick.test.ts tests/waiter-routing.test.ts tests/storage.test.ts`  
Expected: PASS; повар и официант продолжают использовать неизменённый `order.dishId`.

---

### Task 5: Задания на все 33 уровня

**Files:**
- Modify: `src/content/quests.ts`, `src/simulation/progression.ts`, `src/ui/icons.ts`, `src/ui/questPanel.ts`
- Create: `tests/questRework.test.ts`

**Interfaces:**
- Produces: 35 записей `QUESTS` (2 стартовых + `quest-1`…`quest-33`), поле `icon: IconName`, награды по спецификации.

- [ ] **Step 1: Write failing quest coverage tests**

```ts
it('покрывает каждый уровень ровно одним основным заданием', () => {
  expect(QUESTS.filter((quest) => /^quest-\d+$/.test(quest.id))).toHaveLength(33);
  for (let level = 1; level <= 33; level += 1) {
    expect(QUESTS.some((quest) => quest.id === `quest-${level}` && quest.level === level)).toBe(true);
  }
});

it('не выдаёт рецепты автоматически и не повторяет награды', () => {
  expect(QUESTS.every((quest) => quest.unlockDishId === undefined)).toBe(true);
  const state = createGame();
  state.level = 2;
  state.unlockedDishIds.push('pasta');
  processProgression(state);
  expect(state.completedQuestIds).toContain('quest-2');
  const coins = state.coins;
  processProgression(state);
  expect(state.coins).toBe(coins);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/questRework.test.ts tests/progression.test.ts`  
Expected: FAIL из-за 12 записей и старых `unlockDishId`.

- [ ] **Step 3: Implement the exact quest table**

Для уровней 2–33:

```ts
const questReward = (level: number) => ({ coins: 100 * level * level, experience: 30 * level * level });
const recipeCount = (state: GameState) => state.unlockedDishIds.filter((id) => DISHES.some((dish) => dish.id === id)).length;
const tableCount = (state: GameState) => state.furniture.filter((item) => item.kind === 'table' || item.kind === 'tableDouble').length;
```

Создать явный массив из 33 записей по таблице спецификации. `quest-2` проверяет `unlockedDishIds.includes('pasta')`; `quest-9` — `purchasedGuestSlots >= 1`; `quest-20/26/32` — `revenueTotal >= 2500/8000/20000`; `quest-33` — составное `popularity >= 85 && servedTotal >= 250`. Удалить `unlockDishId` из интерфейса и код выдачи из `processProgression`. Добавить каждому заданию один из существующих/новых SVG `icon`, не меняя id выполненных сохранений.

- [ ] **Step 4: Verify every predicate in both directions**

Run: `npx vitest run tests/questRework.test.ts tests/progression.test.ts`  
Expected: PASS; для каждого задания есть как минимум один false→true сценарий, стартовая последовательность остаётся официант → стойка → первый гость.

---

### Task 6: Внешность гостей и обозначение желаний

**Files:**
- Modify: `src/render3d/models.ts`, `src/render3d/actors.ts`, `src/simulation/tick.ts`, `src/persistence/normalizeState.ts`
- Create: `src/render3d/appearance.ts`, `tests/appearance.test.ts`

**Interfaces:**
- Produces: `createAppearance(random: () => number): CustomerAppearance`, `appearanceForId(id): CustomerAppearance`, `createActorMesh(actor)` с теми же именами суставов.

- [ ] **Step 1: Write failing appearance tests**

```ts
it('создаёт пять причёсок и оба силуэта без изменения физических данных', () => {
  const feminine = createActorMesh(makeCustomer({ bodyType: 'feminine', hairStyle: 'bun' }));
  const curly = createActorMesh(makeCustomer({ bodyType: 'masculine', hairStyle: 'curly' }));
  expect(feminine.userData.appearance.bodyType).toBe('feminine');
  expect(feminine.getObjectByName('hair-bun')).toBeDefined();
  expect(curly.getObjectByName('hair-curly')).toBeDefined();
  for (const name of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'head']) {
    expect(feminine.userData.joints[name]).toBeDefined();
  }
  expect(feminine.userData.seatOffset).toBe(0);
});

it('стабильно восстанавливает внешность старого гостя по id', () => {
  expect(appearanceForId('legacy-1')).toEqual(appearanceForId('legacy-1'));
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/appearance.test.ts tests/models3d.test.ts tests/actors3d.test.ts`  
Expected: FAIL по отсутствующему `appearance`.

- [ ] **Step 3: Implement primitive-only appearance**

```ts
export const HAIR_STYLES = ['short', 'long', 'bun', 'ponytail', 'curly'] as const;
export function createAppearance(random: () => number): CustomerAppearance {
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  return {
    bodyType: random() < 0.5 ? 'masculine' : 'feminine', hairStyle: pick(HAIR_STYLES),
    hairColor: pick([0x30231e, 0x6b4226, 0xd6aa58, 0x823f32, 0x202126]),
    skinColor: pick([0xf2c39c, 0xdca47c, 0xb87552, 0x7d4c35]),
    outfitColor: pick([0xd56b75, 0x527bb8, 0x6d9c59, 0xa76dad, 0xd08a45]),
  };
}
```

В `createActorMesh` использовать палитры гостя, слегка расширять нижнюю часть женской одежды через существующий `cylinder`, добавлять группы `hair-short`, `hair-long`, `hair-bun`, `hair-ponytail`, `hair-curly`. Не менять координаты `group`, joints, patienceRing и carrying. Желание отображать отдельной группой `desireBadge` с пятиконечной звездой/табличкой ×5; видимость управляется в `actors.ts` по `guest.hasDesire`.

- [ ] **Step 4: Verify actors and seated animation**

Run: `npx vitest run tests/appearance.test.ts tests/models3d.test.ts tests/actors3d.test.ts`  
Expected: PASS; посадка, ходьба, patienceRing и seatOffset не изменились.

---

### Task 7: Чистая логика календаря

**Files:**
- Create: `src/simulation/calendar.ts`, `tests/calendar.test.ts`
- Modify: `src/simulation/types.ts`, `createGame.ts`, `normalizeState.ts`, `shop.ts`

**Interfaces:**
- Produces: `calendarReward(dayIndex)`, `calendarView(state, today)`, `claimCalendarReward(state, today): CommandResult & { reward?: number }`.
- Consumes: локальную дату `YYYY-MM-DD`, переданную аргументом (никакого скрытого `Date.now` в чистой функции).

- [ ] **Step 1: Write failing date-boundary tests**

```ts
it('считает 100…1550 с шагом 50', () => {
  expect(calendarReward(0)).toBe(100);
  expect(calendarReward(29)).toBe(1550);
});

it('запрещает повтор, продолжает завтра и сбрасывает после пропуска', () => {
  const state = createGame();
  expect(claimCalendarReward(state, '2026-11-15')).toMatchObject({ ok: true, reward: 100 });
  expect(claimCalendarReward(state, '2026-11-15').ok).toBe(false);
  expect(claimCalendarReward(state, '2026-11-16')).toMatchObject({ ok: true, reward: 150 });
  expect(claimCalendarReward(state, '2026-11-18')).toMatchObject({ ok: true, reward: 100 });
});

it('начинает новый цикл после дня 30 и мигрирует старую дату', () => {
  const state = createGame();
  state.calendar = { lastClaimDate: '2026-11-15', nextDayIndex: 0, cycle: 2 };
  state.calendar.nextDayIndex = 0;
  expect(calendarView(state, '2026-11-16').availableIndex).toBe(0);
  const legacy = createGame();
  legacy.lastDailyReward = '2026-11-15';
  normalizeState(legacy);
  expect(legacy.calendar.lastClaimDate).toBe('2026-11-15');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/calendar.test.ts`  
Expected: FAIL по отсутствующему модулю.

- [ ] **Step 3: Implement explicit calendar transitions**

```ts
export const calendarReward = (dayIndex: number) => 100 + 50 * dayIndex;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);

export function claimCalendarReward(state: GameState, today: string) {
  const calendar = state.calendar;
  if (calendar.lastClaimDate === today) return { ok: false as const, reason: 'Награда сегодня уже получена' };
  const gap = calendar.lastClaimDate ? dayNumber(today) - dayNumber(calendar.lastClaimDate) : 0;
  if (!calendar.lastClaimDate || gap !== 1) calendar.nextDayIndex = 0;
  const index = calendar.nextDayIndex;
  const reward = calendarReward(index);
  state.coins += reward;
  calendar.lastClaimDate = today;
  calendar.nextDayIndex = (index + 1) % 30;
  if (index === 29) calendar.cycle += 1;
  state.lastDailyReward = today;
  return { ok: true as const, reward };
}
```

`calendarView` не мутирует состояние; если серия пропущена, доступный индекс отображается 0, а `streakReset: true`. При gap=1 используется `nextDayIndex`. В `createGame` календарь `{lastClaimDate:'', nextDayIndex:0, cycle:1}`. Старый `claimDailyReward` становится обёрткой над `claimCalendarReward`, чтобы старые импорты не ломались.

- [ ] **Step 4: Verify calendar and storage**

Run: `npx vitest run tests/calendar.test.ts tests/storage.test.ts tests/shop.test.ts`  
Expected: PASS, включая повторную нормализацию без добавления монет.

---

### Task 8: HUD, магазин рецептов и панель календаря

**Files:**
- Modify: `src/ui/hud.ts`, `shopPanel.ts`, `shopPanel.css`, `icons.ts`, `styles.css`, `src/simulation/selectors.ts`, `src/main.ts`
- Create: `src/ui/calendarPanel.ts`, `calendarPanel.css`, `tests/calendarPanel.test.ts`, `e2e/gameplay-rework.spec.ts`

**Interfaces:**
- Produces: `createCalendarPanel({ onClaim }): { update(state,today), open(), close(), setVisible(boolean) }`; `createHud` принимает options-объект с пятью callbacks.
- Consumes: команды Tasks 1–7.

- [ ] **Step 1: Write failing DOM tests**

```ts
it('показывает 30 дней и доступную награду', () => {
  const panel = createCalendarPanel({ onClaim: () => undefined });
  panel.update(createGame(), '2026-11-15');
  expect(document.querySelectorAll('[data-calendar-day]')).toHaveLength(30);
  expect(document.querySelector('[data-calendar-day="0"]')?.textContent).toContain('100');
  expect(document.querySelector<HTMLButtonElement>('[data-calendar-claim]')?.disabled).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/calendarPanel.test.ts tests/shopPanel.test.ts tests/selectors.test.ts`  
Expected: FAIL по отсутствующей панели.

- [ ] **Step 3: Implement panels and mutual exclusion**

Создать `CalendarPanel` как `aside` с `aria-label="Календарь наград"`, заголовком, кнопкой «Закрыть», сеткой из 30 кнопок/ячеек и общей кнопкой «Забрать». Классы статусов: `is-claimed`, `is-available`, `is-locked`. При `onClaim` повторно вызывать `update`, не создавать второй тост.

В `main.ts` ввести единый `closePanels()`:

```ts
function closePanels(): void { shop.close(); quests.close(); calendar.close(); }
function openCalendar(): void {
  if (editing) toggleEditor(false);
  cancelPlacement();
  closePanels();
  calendar.open();
}
```

`openShop`, `openProgress`, `toggleEditor` используют ту же взаимоисключающую схему. Claim вызывает `claimCalendarReward(state, localDate())`, сохраняет state и показывает существующий тост ровно 2 секунды. Старую daily-кнопку из магазина удалить.

HUD показывает `Рейтинг`, `Гости active/target/limit`, `Пик mm:ss`; подсказка рейтинга содержит «частота, терпение, чаевые до 20%». Пять равных действий: Магазин, Обстановка, Прогресс, Календарь, Меню. В `getHudModel` добавить `targetGuests`, `guestLimit`, `peak`, `peakRemaining`.

Магазин получает категорию `recipes`; каждая из 33 карточек имеет `data-dish-id`, уникальную SVG-иконку, цену рецепта и блокировку по уровню. Для лимита цена берётся из `guestSlotPrice`, meta: `Уровень: X · Куплено: Y/10`. После максимума кнопка disabled. Сетка календаря 5 колонок на десктопе и 3 на ширине 390 px; ни одна панель не выходит за viewport.

- [ ] **Step 4: Verify DOM tests and production build**

Run: `npx vitest run tests/calendarPanel.test.ts tests/shopPanel.test.ts tests/selectors.test.ts && npm run build`  
Expected: PASS и TypeScript/Vite build без ошибок.

---

### Task 9: Сквозная проверка, адаптивность и 50 гостей

**Files:**
- Create/Modify: `e2e/gameplay-rework.spec.ts`
- Modify только по результатам проверки: профилируемые участки, без смены архитектуры

- [ ] **Step 1: Add end-to-end scenarios**

Playwright через существующий game API/команды подготавливает 7 пригодных мест, официанта и стойку; после ускоренной симуляции проверяет `customers.length` близко к 7 и не выше target. Отдельно создаёт уровень 33, 10 слотов и 50 мест: проверяет `guestLimit === 50`, отсутствие page errors и `document.documentElement.scrollWidth <= innerWidth`. Ещё сценарии: некупленное желание даёт −1, купленное ×5; календарь claim и повторный disabled; прогресс/магазин/календарь не открыты одновременно.

- [ ] **Step 2: Run complete automated suite**

Run: `npm test && npm run build && npm run test:e2e`  
Expected: все unit/integration/E2E PASS, production build создан. Не объявлять успех при любом FAIL.

- [ ] **Step 3: Inspect desktop and mobile**

Открыть игру через существующий preview на 1280×800 и 390×844. Проверить: 33 рецепта прокручиваются внутри панели; 30 ячеек различимы; пять HUD-кнопок не накладываются; цены и статусы не обрезаны; желания читаемы; модели гостей сидят корректно. Сравнить DOM overflow и console/page errors.

- [ ] **Step 4: Measure before optimizing**

На сцене 50 гостей записать среднее время кадра и число draw calls. Если появились измеренные просадки, сначала уменьшить сегменты примитивов/общие материалы, затем повторить тот же замер. Не вводить пулинг или новый renderer без доказанной необходимости.

- [ ] **Step 5: Final save/reload check**

Сохранить состояние с купленными слотами, рецептами, внешностью и календарём; перезагрузить страницу; проверить идентичность полей, отсутствие повторных наград и корректный backup. Оставить preview-сервер под управлением Kimi Work, самостоятельно запущенные серверы остановить.
