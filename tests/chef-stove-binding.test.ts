import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { placeFurniture } from '../src/simulation/commands';
import { applyFurnitureSkin, buyFurnitureSkin } from '../src/simulation/catalogDecorations';
import { furnitureCells } from '../src/simulation/grid';
import { purchaseFurnitureBatch, placePurchasedFurniture } from '../src/simulation/inventory';
import { chefLimit, stoveBurners, stoveForChef, withinChefRange } from '../src/simulation/kitchen';
import { kitchenLayoutWarnings } from '../src/simulation/orderDiagnostics';
import { hireChef } from '../src/simulation/shop';
import { advanceSimulation } from '../src/simulation/tick';
import { normalizeState } from '../src/persistence/normalizeState';
import type { GameState } from '../src/simulation/types';

function equipKitchen(state: GameState, count: 1 | 2 | 3): void {
  state.tick = 1;
  state.arrivalProgress = -10_000;
  if (count >= 2) state.furniture.push(
    { id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 },
  );
  if (count === 3) state.furniture.push(
    { id: 'stove-3', kind: 'stove', position: { x: 5, y: 1 }, rotation: 0 },
  );
  for (let index = 1; index <= count; index += 1) {
    state.furniture.push({ id: `counter-${index}`, kind: 'counter', position: { x: index * 2 - 1, y: 2 }, rotation: 0 });
  }
  for (let index = 2; index <= count; index += 1) {
    state.employees.push({
      id: `chef-${index}`, role: 'chef', position: { x: index * 2, y: 2 }, energy: 100, stoveId: `stove-${index}`,
    });
  }
}

describe('строгая связь повара и плиты', () => {
  it('не нанимает второго повара при одной плите и не списывает монеты', () => {
    const state = createGame();
    state.level = 15;
    const coins = state.coins;
    expect(hireChef(state)).toEqual({ ok: false, reason: 'Недостаточно плит' });
    expect(state.coins).toBe(coins);
    expect(state.employees.filter((employee) => employee.role === 'chef')).toHaveLength(1);
  });

  it('после размещения второй плиты нанимает повара за 15 000 и закрепляет свободную плиту', () => {
    const state = createGame();
    state.level = 15;
    state.coins = 100_000;
    expect(purchaseFurnitureBatch(state, 'stove', 1).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 3, y: 1 }).ok).toBe(true);
    expect(chefLimit(state)).toBe(2);
    expect(hireChef(state).ok).toBe(true);
    const chefs = state.employees.filter((employee) => employee.role === 'chef');
    expect(chefs).toHaveLength(2);
    expect(new Set(chefs.map((chef) => chef.stoveId)).size).toBe(2);
    expect(chefs.every((chef) => stoveForChef(state, chef))).toBe(true);
    expect(state.coins).toBe(65_000);
  });

  it('разрешает дополнительные плиты при меньшем числе поваров', () => {
    const state = createGame();
    state.level = 25;
    state.coins = 100_000;
    expect(purchaseFurnitureBatch(state, 'stove', 2).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 3, y: 1 }).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 5, y: 1 }).ok).toBe(true);
    expect(chefLimit(state)).toBe(3);
    expect(state.employees.filter((employee) => employee.role === 'chef')).toHaveLength(1);
  });

  it('полная покупка 3/3 стоит 120 000 и сохраняет уникальные связи', () => {
    const state = createGame();
    state.level = 25;
    state.coins = 120_000;
    expect(purchaseFurnitureBatch(state, 'stove', 2).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 3, y: 1 }).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 5, y: 1 }).ok).toBe(true);
    expect(hireChef(state).ok).toBe(true);
    expect(hireChef(state).ok).toBe(true);
    const chefs = state.employees.filter((employee) => employee.role === 'chef');
    expect(state.coins).toBe(0);
    expect(chefs).toHaveLength(3);
    expect(new Set(chefs.map((chef) => chef.stoveId)).size).toBe(3);
    expect(chefs.every((chef) => stoveForChef(state, chef))).toBe(true);
    expect(hireChef(state)).toEqual({ ok: false, reason: 'Все повара наняты' });
  });

  it('не нанимает второго повара на 14 уровне и не списывает монеты', () => {
    const state = createGame();
    state.level = 14;
    state.coins = 100_000;
    expect(hireChef(state)).toEqual({ ok: false, reason: 'Нужен 15 уровень' });
    expect(state.coins).toBe(100_000);
  });

  it('не продаёт вторую плиту на 14 уровне и не списывает монеты', () => {
    const state = createGame();
    state.level = 14;
    state.coins = 100_000;
    expect(purchaseFurnitureBatch(state, 'stove', 1)).toEqual({ ok: false, reason: 'Нужен 15 уровень' });
    expect(state.coins).toBe(100_000);
  });

  it('не нанимает третьего повара и не продаёт третью плиту на 24 уровне', () => {
    const state = createGame();
    state.level = 25;
    state.coins = 100_000;
    expect(purchaseFurnitureBatch(state, 'stove', 1).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 3, y: 1 }).ok).toBe(true);
    expect(hireChef(state).ok).toBe(true);
    state.level = 24;
    expect(hireChef(state)).toEqual({ ok: false, reason: 'Нужен 25 уровень' });
    expect(purchaseFurnitureBatch(state, 'stove', 1)).toEqual({ ok: false, reason: 'Нужен 25 уровень' });
    expect(state.coins).toBe(65_000);
  });

  it('блокирует четвёртого повара даже при трёх плитах', () => {
    const state = createGame();
    equipKitchen(state, 3);
    expect(hireChef(state)).toEqual({ ok: false, reason: 'Все повара наняты' });
    expect(state.employees.filter((employee) => employee.role === 'chef')).toHaveLength(3);
  });

  it('повар без плиты ждёт, не изменяет чужой заказ и выдаёт предупреждение', () => {
    const state = createGame();
    equipKitchen(state, 1);
    state.employees.push({ id: 'chef-extra', role: 'chef', position: { x: 3, y: 3 }, energy: 100 });
    state.orders.push(
      { id: 'owned', customerId: 'guest-1', state: 'cooking', progress: 3, dishId: 'soup', stoveId: 'stove-1', chefId: 'chef-1' },
      { id: 'queued', customerId: 'guest-2', state: 'waitingCook', progress: 0, dishId: 'soup' },
    );
    advanceSimulation(state);
    const extraChef = state.employees.find((chef) => chef.id === 'chef-extra')!;
    expect(extraChef.stoveId).toBeUndefined();
    expect(extraChef.activeOrders).toEqual([]);
    expect(state.orders[0].progress).toBe(4);
    expect(state.orders[1]).toMatchObject({ state: 'cooking', progress: 1, stoveId: 'stove-1', chefId: 'chef-1' });
    expect(kitchenLayoutWarnings(state)).toContain('chef-extra: нет собственной плиты, повар ожидает');
  });

  for (const count of [1, 2, 3] as const) {
    it(`конфигурация ${count}/${count}: повара параллельно доводят заказы до выдачи`, () => {
      const state = createGame();
      equipKitchen(state, count);
      const orderCount = count * stoveBurners(state);
      // У каждой плиты есть близкая резервная стойка, чтобы буфер не ограничивал проверку конфорок.
      for (let index = count + 1; index <= count * 2; index += 1) {
        state.furniture.push({ id: `counter-${index}`, kind: 'counter', position: { x: (index - count) * 2 - 1, y: 0 }, rotation: 0 });
      }
      for (let index = 1; index <= orderCount; index += 1) {
        state.orders.push({ id: `order-${index}`, customerId: `guest-${index}`, state: 'waitingCook', progress: 0, dishId: 'soup' });
      }
      advanceSimulation(state, 150);
      expect(state.orders.map((order) => order.state)).toEqual(Array(orderCount).fill('waitingDelivery'));
      expect(new Set(state.orders.map((order) => order.chefId))).toEqual(new Set(Array.from({ length: count }, (_, index) => `chef-${index + 1}`)));
      expect(new Set(state.orders.map((order) => order.stoveId))).toEqual(new Set(Array.from({ length: count }, (_, index) => `stove-${index + 1}`)));
      for (const chef of state.employees) {
        expect(withinChefRange(state, chef.position, stoveForChef(state, chef))).toBe(true);
      }
    });
  }

  it('три повара делят шесть заказов поровну', () => {
    const state = createGame();
    equipKitchen(state, 3);
    for (let index = 1; index <= 6; index += 1) {
      state.orders.push({ id: `balanced-${index}`, customerId: `balanced-guest-${index}`, state: 'waitingCook', progress: 0, dishId: 'soup' });
    }
    advanceSimulation(state);
    for (const chef of state.employees.filter((employee) => employee.role === 'chef')) {
      expect(chef.activeOrders).toHaveLength(2);
    }
  });

  it('сохранение устраняет дубли и битые связи, не отдавая занятую плиту', () => {
    const state = createGame();
    state.furniture.push({ id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 });
    state.employees.push(
      { id: 'chef-2', role: 'chef', position: { x: 4, y: 2 }, energy: 100, stoveId: 'stove-1' },
      { id: 'chef-3', role: 'chef', position: { x: 5, y: 2 }, energy: 100, stoveId: 'missing' },
    );
    normalizeState(state);
    expect(state.employees.map((chef) => [chef.id, chef.stoveId])).toEqual([
      ['chef-1', 'stove-1'], ['chef-2', 'stove-2'], ['chef-3', undefined],
    ]);
    normalizeState(state);
    expect(state.employees.map((chef) => chef.stoveId)).toEqual(['stove-1', 'stove-2', undefined]);
  });
});

describe('двухклеточный скин плиты', () => {
  it('обычная плита занимает одну клетку, скин — две с учётом поворота', () => {
    const state = createGame();
    const stove = state.furniture.find((item) => item.kind === 'stove')!;
    expect(furnitureCells(stove, state)).toEqual([{ x: 1, y: 1 }]);
    state.appliedStoveSkins.push({ furnitureId: stove.id, skinId: 'industrialStove' });
    expect(furnitureCells(stove, state)).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }]);
    stove.rotation = 90;
    expect(furnitureCells(stove, state)).toEqual([{ x: 1, y: 1 }, { x: 1, y: 2 }]);
  });

  it('покупается и применяется, а повар продолжает полный цикл на своей плите', () => {
    const state = createGame();
    state.level = 30;
    state.coins = 20_000;
    expect(buyFurnitureSkin(state, 'industrialStove').ok).toBe(true);
    expect(state.coins).toBe(8_000);
    expect(applyFurnitureSkin(state, 'industrialStove', 'stove-1').ok).toBe(true);
    expect(furnitureCells(state.furniture.find((item) => item.id === 'stove-1')!, state)).toHaveLength(2);
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 });
    state.orders.push({ id: 'order-wide', customerId: 'guest-wide', state: 'waitingCook', progress: 0, dishId: 'soup' });
    state.tick = 1;
    state.arrivalProgress = -10_000;
    advanceSimulation(state, 150);
    expect(state.orders[0]).toMatchObject({ state: 'waitingDelivery', stoveId: 'stove-1', chefId: 'chef-1', counterId: 'counter-1' });
  });

  it('не применяется при занятой второй клетке или выходе за границу', () => {
    const state = createGame();
    state.ownedFurnitureSkins.push('industrialStove');
    state.furniture.push({ id: 'blocker', kind: 'plant', position: { x: 2, y: 1 }, rotation: 0 });
    expect(applyFurnitureSkin(state, 'industrialStove', 'stove-1')).toEqual({ ok: false, reason: 'Для плиты 1×2 нужны две свободные клетки' });
    expect(state.appliedStoveSkins).toEqual([]);
    state.furniture = state.furniture.filter((item) => item.id !== 'blocker');
    state.furniture.find((item) => item.id === 'stove-1')!.position = { x: 7, y: 7 };
    expect(applyFurnitureSkin(state, 'industrialStove', 'stove-1').ok).toBe(false);
    expect(state.appliedStoveSkins).toEqual([]);
  });

  it('размещение обычной плиты по-прежнему проверяет только одну клетку', () => {
    const state = createGame();
    state.level = 15;
    state.coins = 20_000;
    expect(placeFurniture(state, 'stove', { x: 7, y: 7 }).ok).toBe(true);
    expect(state.coins).toBe(0);
  });
});
