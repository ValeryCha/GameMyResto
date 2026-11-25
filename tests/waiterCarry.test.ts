import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { waiterCarryCapacity } from '../src/simulation/staff';
import { advanceSimulation } from '../src/simulation/tick';
import type { GameState } from '../src/simulation/types';

function pickupScene(level: number): GameState {
  const state = createGame();
  state.width = 12;
  state.arrivalProgress = -10_000;
  state.upgrades.waiter = level;
  state.employees = [{ id: 'waiter-1', role: 'waiter', position: { x: 1, y: 3 }, energy: 100 }];
  state.furniture = [
    { id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 },
    { id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 },
  ];
  const positions = [{ x: 6, y: 3 }, { x: 8, y: 3 }, { x: 10, y: 3 }];
  for (let index = 0; index < positions.length; index += 1) {
    const id = index + 1;
    state.furniture.push({ id: `chair-${id}`, kind: 'chair', position: positions[index], rotation: 0 });
    state.customers.push({ id: `guest-${id}`, position: { ...positions[index] }, state: 'waitingFood', patience: 10_000, foodWait: 10_000, seatId: `chair-${id}`, orderId: `order-${id}` });
    state.orders.push({ id: `order-${id}`, customerId: `guest-${id}`, state: 'waitingDelivery', progress: 6, dishId: 'soup', counterId: 'counter-1' });
  }
  return state;
}

function serviceScene(level: number): GameState {
  const state = createGame();
  state.width = 20;
  state.height = 20;
  state.upgrades.waiter = level;
  state.employees = [];
  state.furniture = state.furniture.filter((item) => item.kind !== 'stove' && item.kind !== 'counter');
  for (let index = 0; index < 3; index += 1) {
    const x = 1 + index * 2;
    state.furniture.push(
      { id: `stove-${index + 1}`, kind: 'stove', position: { x, y: 1 }, rotation: 0 },
      { id: `counter-${index + 1}`, kind: 'counter', position: { x, y: 2 }, rotation: 0 },
    );
    state.employees.push({ id: `chef-${index + 1}`, role: 'chef', position: { x: x + 1, y: 1 }, energy: 100, stoveId: `stove-${index + 1}` });
  }
  state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 3, y: 4 }, energy: 100 });
  return state;
}

function busyScene(): GameState {
  const state = createGame();
  state.width = 20;
  state.height = 20;
  state.arrivalProgress = -10_000;
  state.upgrades.waiter = 3;
  state.employees = [];
  state.furniture = state.furniture.filter((item) => item.kind === 'door');
  for (let index = 0; index < 3; index += 1) {
    const x = 1 + index * 2;
    state.furniture.push(
      { id: `stove-${index + 1}`, kind: 'stove', position: { x, y: 1 }, rotation: 0 },
      { id: `counter-${index + 1}`, kind: 'counter', position: { x, y: 2 }, rotation: 0 },
    );
    state.employees.push({ id: `chef-${index + 1}`, role: 'chef', position: { x: x + 1, y: 1 }, energy: 100, stoveId: `stove-${index + 1}` });
  }
  for (let index = 0; index < 5; index += 1) {
    state.employees.push({ id: `waiter-${index + 1}`, role: 'waiter', position: { x: 2 + index, y: 4 }, energy: 100 });
  }
  for (let index = 0; index < 15; index += 1) {
    const id = index + 1;
    const x = 10 + (index % 3);
    const y = 2 + Math.floor(index / 3) * 3;
    state.furniture.push({ id: `chair-${id}`, kind: 'chair', position: { x, y }, rotation: 0 });
    state.customers.push({ id: `guest-${id}`, position: { x, y }, state: 'waitingFood', patience: 10_000, foodWait: 10_000, seatId: `chair-${id}`, orderId: `order-${id}` });
    state.orders.push({ id: `order-${id}`, customerId: `guest-${id}`, state: 'waitingDelivery', progress: 6, dishId: 'soup', counterId: `counter-${(index % 3) + 1}` });
  }
  return state;
}

describe('LOGIC-8.2 — мульти-забор официантом', () => {
  it('вместимость растёт с уровнями 1 → 2 → 3', () => {
    expect([0, 1, 2, 3, 4, 5].map(waiterCarryCapacity)).toEqual([1, 1, 1, 2, 2, 3]);
  });

  it('вместимость ограничена тремя после пятого уровня', () => {
    expect(waiterCarryCapacity(6)).toBe(3);
  });

  it('на пятом уровне забирает все три заказа со стойки за один заход', () => {
    const state = pickupScene(5);
    advanceSimulation(state);
    expect(state.employees[0].orderIds).toHaveLength(3);
    expect(state.orders.filter((order) => order.pickedUp)).toHaveLength(3);
  });

  it('без прокачки забирает один заказ даже при трёх на стойке', () => {
    const state = pickupScene(0);
    advanceSimulation(state);
    expect(state.employees[0].orderIds).toHaveLength(1);
    expect(state.orders.filter((order) => order.pickedUp)).toHaveLength(1);
  });

  it('доставляет заказы по очереди от ближайшего гостя к дальнему', () => {
    const state = pickupScene(5);
    const delivered: string[] = [];
    let previous = new Set<string>();
    for (let tick = 0; tick < 100 && delivered.length < 3; tick += 1) {
      advanceSimulation(state);
      const current = new Set(state.orders.filter((order) => order.state === 'delivered').map((order) => order.id));
      delivered.push(...[...current].filter((id) => !previous.has(id)));
      previous = current;
    }
    expect(delivered).toEqual(['order-1', 'order-2', 'order-3']);
  });

  it('после последней доставки очищает очередь и активную задачу', () => {
    const state = pickupScene(5);
    advanceSimulation(state, 100);
    expect(state.orders.every((order) => order.state === 'delivered')).toBe(true);
    expect(state.employees[0].orderIds).toEqual([]);
    expect(state.employees[0].taskId).toBeUndefined();
  });

  it('3 повара / 3 плиты / 3 стойки: пятый уровень обслуживает больше гостей за 300 тиков', () => {
    const basic = serviceScene(0);
    const upgraded = serviceScene(5);
    advanceSimulation(basic, 300);
    advanceSimulation(upgraded, 300);
    expect(upgraded.servedTotal).toBeGreaterThan(basic.servedTotal);
  });

  it('3 повара / 3 плиты / 3 стойки и 5 официантов: все доставляют без простоя дольше пяти тиков', () => {
    const state = busyScene();
    const deliveredBy = new Set<string>();
    const idle = Object.fromEntries(state.employees.filter((employee) => employee.role === 'waiter').map((waiter) => [waiter.id, 0]));
    const maxIdle = { ...idle };
    for (let tick = 0; tick < 300; tick += 1) {
      advanceSimulation(state);
      for (const order of state.orders) {
        if (order.state === 'delivered' && order.assignedTo) deliveredBy.add(order.assignedTo);
      }
      for (const waiter of state.employees.filter((employee) => employee.role === 'waiter')) {
        idle[waiter.id] = waiter.taskId ? 0 : idle[waiter.id] + 1;
        maxIdle[waiter.id] = Math.max(maxIdle[waiter.id], idle[waiter.id]);
      }
      for (const order of state.orders) {
        if (order.state !== 'delivered') continue;
        const guest = state.customers.find((customer) => customer.id === order.customerId)!;
        order.state = 'waitingDelivery';
        order.assignedTo = undefined;
        order.pickedUp = false;
        guest.state = 'waitingFood';
        guest.foodWait = 10_000;
      }
    }
    expect(deliveredBy).toEqual(new Set(['waiter-1', 'waiter-2', 'waiter-3', 'waiter-4', 'waiter-5']));
    expect(Math.max(...Object.values(maxIdle))).toBeLessThanOrEqual(5);
  });
});
