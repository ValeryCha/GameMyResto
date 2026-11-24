import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { stoveBurners } from '../src/simulation/kitchen';
import { advanceSimulation } from '../src/simulation/tick';
import type { GameState, Order } from '../src/simulation/types';

function kitchenState(chefCount = 1, stoveCount = chefCount): GameState {
  const state = createGame();
  state.tick = 1;
  state.arrivalProgress = -10_000;
  state.furniture = [{ id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 }];
  state.employees = [];
  for (let index = 0; index < stoveCount; index += 1) {
    const x = 1 + index * 2;
    state.furniture.push({ id: `stove-${index + 1}`, kind: 'stove', position: { x, y: 1 }, rotation: 0 });
    if (index < chefCount) state.employees.push({
      id: `chef-${index + 1}`, role: 'chef', position: { x: x + 1, y: 1 }, energy: 100, stoveId: `stove-${index + 1}`,
    });
  }
  return state;
}

function addOrder(state: GameState, id: string, overrides: Partial<Order> = {}): Order {
  const order: Order = { id, customerId: `guest-${id}`, state: 'waitingCook', progress: 0, dishId: 'soup', ...overrides };
  state.orders.push(order);
  return order;
}

describe('конфорки и параллельная готовка', () => {
  it('stoveBurners возвращает 2, 3 и максимум 4 конфорки', () => {
    expect(stoveBurners(kitchenState(1, 1))).toBe(2);
    expect(stoveBurners(kitchenState(1, 2))).toBe(3);
    expect(stoveBurners(kitchenState(3, 3))).toBe(4);
  });

  it('один повар на одной плите берёт два заказа', () => {
    const state = kitchenState();
    addOrder(state, 'order-1');
    addOrder(state, 'order-2');
    advanceSimulation(state);
    expect(state.employees[0].activeOrders).toEqual(['order-1', 'order-2']);
    expect(state.employees[0].taskId).toBeUndefined();
  });

  it('один повар при двух плитах готовит три блюда только на своей', () => {
    const state = kitchenState(1, 2);
    for (let index = 1; index <= 4; index += 1) addOrder(state, `order-${index}`);
    advanceSimulation(state);
    expect(state.employees[0].activeOrders).toHaveLength(3);
    expect(state.orders.filter((order) => order.stoveId === 'stove-1')).toHaveLength(3);
    expect(state.orders.some((order) => order.stoveId === 'stove-2')).toBe(false);
    expect(state.orders.find((order) => order.id === 'order-4')?.stoveId).toBeUndefined();
  });

  it('три повара на трёх плитах берут по четыре заказа', () => {
    const state = kitchenState(3, 3);
    for (let index = 1; index <= 12; index += 1) addOrder(state, `order-${index}`);
    advanceSimulation(state);
    for (const chef of state.employees) expect(chef.activeOrders).toHaveLength(4);
    expect(state.orders.filter((order) => order.stoveId)).toHaveLength(12);
  });

  it('прогресс каждого активного заказа независим', () => {
    const state = kitchenState();
    const first = addOrder(state, 'order-1', { state: 'cooking', stoveId: 'stove-1', chefId: 'chef-1', progress: 1 });
    const second = addOrder(state, 'order-2', { state: 'cooking', stoveId: 'stove-1', chefId: 'chef-1', progress: 4 });
    state.employees[0].activeOrders = [first.id, second.id];
    advanceSimulation(state);
    expect(first.progress).toBe(2);
    expect(second.progress).toBe(5);
    expect(state.employees[0].activeOrders).toEqual([first.id, second.id]);
  });

  it('повар добирает заказы из waitingCook до свободного лимита', () => {
    const state = kitchenState();
    addOrder(state, 'active', { state: 'cooking', stoveId: 'stove-1', chefId: 'chef-1', progress: 2 });
    addOrder(state, 'queued');
    state.employees[0].activeOrders = ['active'];
    advanceSimulation(state);
    expect(state.employees[0].activeOrders).toEqual(['active', 'queued']);
    expect(state.orders.find((order) => order.id === 'queued')).toMatchObject({ state: 'cooking', progress: 1, stoveId: 'stove-1', chefId: 'chef-1' });
  });

  it('новый заказ ждёт, когда все конфорки заняты', () => {
    const state = kitchenState();
    for (let index = 1; index <= 2; index += 1) addOrder(state, `active-${index}`, { state: 'cooking', stoveId: 'stove-1', chefId: 'chef-1' });
    addOrder(state, 'queued');
    state.employees[0].activeOrders = ['active-1', 'active-2'];
    advanceSimulation(state);
    expect(state.employees[0].activeOrders).toEqual(['active-1', 'active-2']);
    expect(state.orders.find((order) => order.id === 'queued')).toMatchObject({ state: 'waitingCook', progress: 0 });
    expect(state.orders.find((order) => order.id === 'queued')?.stoveId).toBeUndefined();
    expect(state.orders.find((order) => order.id === 'queued')?.chefId).toBeUndefined();
  });

  it('каждый заказ визуально привязан к плите и повару', () => {
    const state = kitchenState(3, 3);
    for (let index = 1; index <= 12; index += 1) addOrder(state, `order-${index}`);
    advanceSimulation(state);
    for (const chef of state.employees) {
      for (const id of chef.activeOrders ?? []) {
        expect(state.orders.find((order) => order.id === id)).toMatchObject({ stoveId: chef.stoveId, chefId: chef.id, state: 'cooking' });
      }
    }
  });
});
