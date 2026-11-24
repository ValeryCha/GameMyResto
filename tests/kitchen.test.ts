import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { purchaseFurnitureBatch, placePurchasedFurniture } from '../src/simulation/inventory';
import { counterDeliveryInterval, kitchenDistance, nextStovePrice, withinChefRange } from '../src/simulation/kitchen';
import { advanceSimulation } from '../src/simulation/tick';
import { normalizeState } from '../src/persistence/normalizeState';

function addStovesAndCounters(state: ReturnType<typeof createGame>) {
  state.tick = 1;
  state.arrivalProgress = -10_000;
  state.furniture.push(
    { id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 },
    { id: 'stove-3', kind: 'stove', position: { x: 5, y: 1 }, rotation: 0 },
    { id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 },
    { id: 'counter-2', kind: 'counter', position: { x: 3, y: 2 }, rotation: 0 },
    { id: 'counter-3', kind: 'counter', position: { x: 5, y: 2 }, rotation: 0 },
  );
}

describe('кухня с тремя плитами', () => {
  it('списывает 20 000 за вторую и 50 000 за третью, запрещая четвёртую', () => {
    const state = createGame();
    state.level = 25;
    state.coins = 100_000;
    expect(nextStovePrice(state)).toBe(20_000);
    expect(purchaseFurnitureBatch(state, 'stove', 1)).toEqual({ ok: true });
    expect(state.coins).toBe(80_000);
    expect(nextStovePrice(state)).toBe(50_000);
    expect(purchaseFurnitureBatch(state, 'stove', 1)).toEqual({ ok: true });
    expect(state.coins).toBe(30_000);
    expect(purchaseFurnitureBatch(state, 'stove', 1)).toEqual({ ok: false, reason: 'Можно иметь не больше трёх плит' });
    expect(state.coins).toBe(30_000);
    expect(placePurchasedFurniture(state, 'stove', { x: 3, y: 1 }).ok).toBe(true);
    expect(placePurchasedFurniture(state, 'stove', { x: 5, y: 1 }).ok).toBe(true);
    state.furnitureInventory.stove = 1;
    expect(placePurchasedFurniture(state, 'stove', { x: 7, y: 1 })).toEqual({ ok: false, reason: 'Можно разместить не больше трёх плит' });
  });

  it('возвращает интервалы 1 / 0,7 / 0,5 секунды', () => {
    const state = createGame();
    expect(counterDeliveryInterval(state)).toBe(1);
    state.furniture.push({ id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 });
    expect(counterDeliveryInterval(state)).toBeCloseTo(0.7);
    state.furniture.push({ id: 'stove-3', kind: 'stove', position: { x: 5, y: 1 }, rotation: 0 });
    expect(counterDeliveryInterval(state)).toBeCloseTo(0.5);
  });

  it('одновременно готовит три заказа на разных плитах и использует ближайшие стойки', () => {
    const state = createGame();
    addStovesAndCounters(state);
    state.employees.push(
      { id: 'chef-2', role: 'chef', position: { x: 4, y: 2 }, energy: 100, stoveId: 'stove-2' },
      { id: 'chef-3', role: 'chef', position: { x: 6, y: 2 }, energy: 100, stoveId: 'stove-3' },
    );
    state.orders.push(
      { id: 'order-1', customerId: 'guest-1', state: 'waitingCook', progress: 0, dishId: 'soup' },
      { id: 'order-2', customerId: 'guest-2', state: 'waitingCook', progress: 0, dishId: 'soup' },
      { id: 'order-3', customerId: 'guest-3', state: 'waitingCook', progress: 0, dishId: 'soup' },
    );

    advanceSimulation(state);
    expect(new Set(state.orders.map((order) => order.stoveId))).toEqual(new Set(['stove-1', 'stove-2', 'stove-3']));
    expect(state.orders.map((order) => order.chefId)).toEqual(['chef-1', 'chef-2', 'chef-3']);
    expect(state.orders.map((order) => order.progress)).toEqual([1, 1, 1]);

    for (let tick = 0; tick < 120; tick += 1) {
      advanceSimulation(state);
      for (const chef of state.employees) {
        expect(withinChefRange(state, chef.position, state.furniture.find((item) => item.id === chef.stoveId))).toBe(true);
      }
    }
    expect(state.orders.every((order) => order.state === 'waitingDelivery')).toBe(true);
    expect(state.orders.map((order) => order.counterId)).toEqual(['counter-1', 'counter-2', 'counter-3']);
  });

  it('два закреплённых повара передают по готовому блюду за один тик', () => {
    const state = createGame();
    addStovesAndCounters(state);
    state.employees[0].position = { x: 2, y: 3 };
    state.employees.push({ id: 'chef-2', role: 'chef', position: { x: 4, y: 3 }, energy: 100, stoveId: 'stove-2' });
    state.furniture = state.furniture.filter((item) => item.id !== 'counter-3');
    state.orders.push(
      { id: 'order-1', customerId: 'guest-1', state: 'cooking', progress: 6, dishId: 'soup', stoveId: 'stove-1', chefId: 'chef-1' },
      { id: 'order-2', customerId: 'guest-2', state: 'cooking', progress: 6, dishId: 'soup', stoveId: 'stove-2', chefId: 'chef-2' },
    );
    advanceSimulation(state);
    expect(state.orders.map((order) => order.state)).toEqual(['waitingDelivery', 'waitingDelivery']);
  });

  it('восстанавливает старый заказ без плиты и очищает неправильный прогресс', () => {
    const state = createGame();
    state.furniture.push({ id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 });
    state.furnitureInventory.stove = 10;
    state.orders.push(
      { id: 'legacy', customerId: 'guest-1', state: 'waitingCook', progress: 2, dishId: 'soup', stoveId: 'missing', deliveryProgress: -5 },
      { id: 'valid', customerId: 'guest-2', state: 'cooking', progress: 3, dishId: 'soup', stoveId: 'stove-1', deliveryProgress: Number.NaN },
    );
    normalizeState(state);
    expect(state.furnitureInventory.stove).toBe(1);
    expect(state.orders[0].stoveId).toBeUndefined();
    expect(state.orders[0].deliveryProgress).toBe(0);
    expect(state.orders[1].stoveId).toBe('stove-1');
    expect(state.orders[1].deliveryProgress).toBe(0);
    state.tick = 1;
    state.arrivalProgress = -10_000;
    advanceSimulation(state);
    expect(state.orders[0].stoveId).toBeUndefined();
    expect(state.orders[0].chefId).toBeUndefined();
    expect(state.orders[0].state).toBe('waitingCook');
    expect(state.orders[0].progress).toBe(2);
    expect(state.orders[1].progress).toBe(4);
  });

  it('не выпускает повара дальше двух клеток от ближайшей плиты в длительном цикле', () => {
    for (const count of [1, 2, 3]) {
      const state = createGame();
      addStovesAndCounters(state);
      state.furniture = state.furniture.filter((item) =>
        item.kind !== 'stove' || Number(item.id.split('-')[1]) <= count);
      for (let index = 0; index < 12; index += 1) {
        state.orders.push({ id: `order-${index}`, customerId: `guest-${index}`, state: 'waitingCook', progress: 0, dishId: 'soup' });
      }
      for (let tick = 0; tick < 240; tick += 1) {
        advanceSimulation(state);
        const chef = state.employees[0];
        const nearest = Math.min(...state.furniture.filter((item) => item.kind === 'stove')
          .map((stove) => kitchenDistance(chef.position, stove.position)));
        expect(nearest).toBeLessThanOrEqual(2);
      }
      // В тесте один повар: его рабочая зона охватывает две стойки по три слота.
      const capacity = 6;
      expect(state.orders.filter((order) => order.state === 'waitingDelivery')).toHaveLength(capacity);
      expect(state.orders.filter((order) => order.state !== 'waitingDelivery')).toHaveLength(12 - capacity);
    }
  });
});
