import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { COUNTER_MAX_SLOTS, counterLoad } from '../src/simulation/counterService';
import { advanceSimulation } from '../src/simulation/tick';
import type { GameState } from '../src/simulation/types';

function kitchenState(chefCount = 1, counterCount = 1): GameState {
  const state = createGame();
  state.tick = 1;
  state.arrivalProgress = -10_000;
  state.furniture = [{ id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 }];
  state.employees = [];
  for (let index = 0; index < chefCount; index += 1) {
    const x = 1 + index * 2;
    state.furniture.push({ id: `stove-${index + 1}`, kind: 'stove', position: { x, y: 1 }, rotation: 0 });
    state.employees.push({ id: `chef-${index + 1}`, role: 'chef', position: { x: x + 1, y: 1 }, energy: 100, stoveId: `stove-${index + 1}` });
  }
  for (let index = 0; index < counterCount; index += 1) {
    state.furniture.push({ id: `counter-${index + 1}`, kind: 'counter', position: { x: 1 + index * 2, y: 2 }, rotation: 0 });
  }
  return state;
}

function addCookedOrder(state: GameState, id: string, chefIndex = 0): void {
  state.orders.push({
    id, customerId: `guest-${id}`, state: 'cooking', progress: 6, dishId: 'soup',
    stoveId: `stove-${chefIndex + 1}`, chefId: `chef-${chefIndex + 1}`,
  });
}

function addBufferedOrder(state: GameState, id: string, counterId: string): void {
  state.orders.push({ id, customerId: `guest-${id}`, state: 'waitingDelivery', progress: 6, dishId: 'soup', counterId });
}

describe('буферы стоек и выбор повара', () => {
  it('counterLoad считает только ожидающие выдачи заказы на указанной стойке', () => {
    const state = kitchenState(1, 2);
    addBufferedOrder(state, 'ready-1', 'counter-1');
    addBufferedOrder(state, 'ready-2', 'counter-1');
    addBufferedOrder(state, 'other', 'counter-2');
    state.orders.push({ id: 'cooking', customerId: 'guest-cooking', state: 'cooking', progress: 2, counterId: 'counter-1' });
    expect(counterLoad(state, 'counter-1')).toBe(2);
    expect(counterLoad(state, 'counter-2')).toBe(1);
  });

  it('экспортирует COUNTER_MAX_SLOTS = 3', () => {
    expect(COUNTER_MAX_SLOTS).toBe(3);
  });

  it('повар кладёт заказ на свою стойку по индексу, если там меньше трёх заказов', () => {
    const state = kitchenState(2, 2);
    // Собственная counter-1 стоит дальше: ближайшая counter-2 не должна выбираться без необходимости.
    state.furniture.find((item) => item.id === 'counter-1')!.position = { x: 3, y: 2 };
    state.furniture.find((item) => item.id === 'counter-2')!.position = { x: 1, y: 2 };
    addCookedOrder(state, 'order-own', 0);
    advanceSimulation(state);
    expect(state.orders[0]).toMatchObject({ state: 'waitingDelivery', counterId: 'counter-1' });
  });

  it('при заполненной собственной стойке выбирает ближайшую свободную', () => {
    const state = kitchenState(1, 2);
    for (let index = 0; index < 3; index += 1) addBufferedOrder(state, `full-${index}`, 'counter-1');
    addCookedOrder(state, 'fallback');
    advanceSimulation(state);
    expect(state.orders.find((order) => order.id === 'fallback')).toMatchObject({ state: 'waitingDelivery', counterId: 'counter-2' });
    expect(counterLoad(state, 'counter-1')).toBe(3);
  });

  it('при заполнении всех стоек повар ждёт и сбрасывает taskId', () => {
    const state = kitchenState(1, 2);
    for (const counter of ['counter-1', 'counter-2']) {
      for (let index = 0; index < 3; index += 1) addBufferedOrder(state, `${counter}-${index}`, counter);
    }
    addCookedOrder(state, 'waiting');
    advanceSimulation(state);
    expect(state.orders.find((order) => order.id === 'waiting')?.state).toBe('cooking');
    expect(state.employees[0].taskId).toBeUndefined();
    expect(counterLoad(state, 'counter-1')).toBe(3);
    expect(counterLoad(state, 'counter-2')).toBe(3);
  });

  it('официант забирает заказ со своей стойки в приоритете', () => {
    const state = kitchenState(1, 2);
    state.employees.push(
      { id: 'waiter-1', role: 'waiter', position: { x: 1, y: 3 }, energy: 100 },
      { id: 'waiter-2', role: 'waiter', position: { x: 3, y: 3 }, energy: 100 },
    );
    state.customers.push(
      { id: 'guest-home', position: { x: 5, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-1' },
      { id: 'guest-other', position: { x: 5, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-1' },
    );
    state.furniture.push({ id: 'chair-1', kind: 'chair', position: { x: 5, y: 5 }, rotation: 0 });
    state.orders.push(
      { id: 'other', customerId: 'guest-other', state: 'waitingDelivery', progress: 6, counterId: 'counter-2' },
      { id: 'home', customerId: 'guest-home', state: 'waitingDelivery', progress: 6, counterId: 'counter-1' },
    );
    advanceSimulation(state);
    expect(state.employees.find((employee) => employee.id === 'waiter-1')?.taskId).toBe('home');
    expect(state.employees.find((employee) => employee.id === 'waiter-2')?.taskId).toBe('other');
  });

  it('один повар с буфером из трёх слотов передаёт больше заказов, чем при одном слоте', () => {
    const state = kitchenState();
    for (let index = 0; index < 8; index += 1) addCookedOrder(state, `order-${index}`);
    advanceSimulation(state, 300);
    expect(counterLoad(state, 'counter-1')).toBe(3);
    expect(counterLoad(state, 'counter-1')).toBeGreaterThan(1);
    expect(state.orders.filter((order) => order.state === 'cooking')).toHaveLength(5);
  });

  it('три повара работают параллельно и распределяют заказы не более чем по три на стойку', () => {
    const state = kitchenState(3, 3);
    for (let chef = 0; chef < 3; chef += 1) {
      for (let index = 0; index < 3; index += 1) {
        addCookedOrder(state, `order-${chef}-${index}`, chef);
        state.orders[state.orders.length - 1].progress = 5;
        state.orders[state.orders.length - 1].chefId = undefined;
      }
    }
    advanceSimulation(state, 300);
    for (const chef of state.employees) {
      expect(state.orders.some((order) => order.chefId === chef.id && order.state === 'waitingDelivery')).toBe(true);
    }
    for (const counter of ['counter-1', 'counter-2', 'counter-3']) expect(counterLoad(state, counter)).toBe(3);
    expect(state.orders.filter((order) => order.state === 'waitingDelivery')).toHaveLength(9);
  });
});
