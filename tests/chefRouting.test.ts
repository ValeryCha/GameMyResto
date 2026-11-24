import { describe, expect, it } from 'vitest';
import { moveFurniture } from '../src/simulation/commands';
import { assignOrderToCounter, counterForChef, counterLoad } from '../src/simulation/counterService';
import { distanceToStove, stoveForChef } from '../src/simulation/kitchen';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import type { GameState, Order } from '../src/simulation/types';

function threeChefKitchen(): GameState {
  const state = createGame();
  state.tick = 1;
  state.arrivalProgress = -10_000;
  state.furniture = [{ id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 }];
  state.employees = [];
  for (let index = 0; index < 3; index += 1) {
    const x = 1 + index * 2;
    state.furniture.push(
      { id: `stove-${index + 1}`, kind: 'stove', position: { x, y: 1 }, rotation: 0 },
      { id: `counter-${index + 1}`, kind: 'counter', position: { x, y: 2 }, rotation: 0 },
    );
    state.employees.push({ id: `chef-${index + 1}`, role: 'chef', position: { x: x + 1, y: 2 }, energy: 100, stoveId: `stove-${index + 1}` });
  }
  return state;
}

function readyOrder(id: string, counterId?: string): Order {
  return { id, customerId: `guest-${id}`, state: 'waitingDelivery', progress: 6, dishId: 'soup', counterId };
}

describe('LOGIC-8.4 — маршрутизация поваров и баланс стоек', () => {
  it('после перемещения плиты переносит повара на свободную соседнюю клетку', () => {
    const state = createGame();
    state.editorMode = true;
    const stove = state.furniture.find((item) => item.id === 'stove-1')!;
    const chef = state.employees[0];
    expect(moveFurniture(state, stove.id, { x: 7, y: 7 }).ok).toBe(true);
    expect(distanceToStove(state, chef.position, stove)).toBe(1);
    expect(stoveForChef(state, chef)?.id).toBe(stove.id);
    const previous = { ...chef.position };
    advanceSimulation(state);
    expect(distanceToStove(state, chef.position, stove)).toBeLessThanOrEqual(2);
    expect(state.furniture.some((item) => item.position.x === chef.position.x && item.position.y === chef.position.y)).toBe(false);
    expect(chef.position).toEqual(previous);
  });

  it('при перемещении плиты прерывает готовку и очищает привязки заказов', () => {
    const state = createGame();
    state.editorMode = true;
    state.orders.push(
      { id: 'order-1', customerId: 'guest-1', state: 'cooking', progress: 3, dishId: 'soup', stoveId: 'stove-1', chefId: 'chef-1' },
      { id: 'order-2', customerId: 'guest-2', state: 'cooking', progress: 1, dishId: 'soup', stoveId: 'stove-1', chefId: 'chef-1' },
    );
    state.employees[0].activeOrders = ['order-1', 'order-2'];
    state.employees[0].target = { x: 2, y: 1 };
    expect(moveFurniture(state, 'stove-1', { x: 7, y: 7 }).ok).toBe(true);
    expect(state.employees[0].activeOrders).toEqual([]);
    expect(state.employees[0].target).toBeUndefined();
    for (const order of state.orders) expect(order).toMatchObject({ state: 'waitingCook', progress: order.id === 'order-1' ? 3 : 1 });
    expect(state.orders.every((order) => order.stoveId === undefined && order.chefId === undefined)).toBe(true);
  });

  it('при заполненной первой стойке повара 2 и 3 используют свободные стойки', () => {
    const state = threeChefKitchen();
    for (let index = 0; index < 3; index += 1) state.orders.push(readyOrder(`full-${index}`, 'counter-1'));
    expect(counterForChef(state, state.employees[1])?.id).toBe('counter-2');
    expect(counterForChef(state, state.employees[2])?.id).toBe('counter-3');
  });

  it('равномерно распределяет шесть готовых заказов по трём стойкам', () => {
    const state = threeChefKitchen();
    for (let index = 1; index <= 6; index += 1) {
      const order = readyOrder(`order-${index}`);
      state.orders.push(order);
      assignOrderToCounter(state, order);
    }
    expect(counterLoad(state, 'counter-1')).toBe(2);
    expect(counterLoad(state, 'counter-2')).toBe(2);
    expect(counterLoad(state, 'counter-3')).toBe(2);
  });

  it('повар издалека сокращает расстояние до собственной плиты', () => {
    const state = createGame();
    state.tick = 1;
    state.arrivalProgress = -10_000;
    const chef = state.employees[0];
    const stove = stoveForChef(state, chef)!;
    chef.position = { x: 6, y: 6 };
    state.orders.push({ id: 'order-far', customerId: 'guest-far', state: 'waitingCook', progress: 0, dishId: 'soup', stoveId: stove.id, chefId: chef.id });
    const before = distanceToStove(state, chef.position, stove);
    advanceSimulation(state);
    expect(before).toBeGreaterThan(5);
    expect(distanceToStove(state, chef.position, stove)).toBeLessThan(before);
    expect(state.orders[0].state).toBe('cooking');
  });

  it('после перемещения сохраняет уникальную связку каждого повара с плитой', () => {
    const state = createGame();
    state.editorMode = true;
    state.furniture.push({ id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 });
    state.employees.push({ id: 'chef-2', role: 'chef', position: { x: 4, y: 2 }, energy: 100, stoveId: 'stove-2' });
    expect(moveFurniture(state, 'stove-1', { x: 7, y: 7 }).ok).toBe(true);
    expect(state.employees.map((chef) => chef.stoveId)).toEqual(['stove-1', 'stove-2']);
    expect(new Set(state.employees.map((chef) => chef.stoveId)).size).toBe(2);
  });
});
