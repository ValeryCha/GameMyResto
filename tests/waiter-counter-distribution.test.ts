import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import type { GameState } from '../src/simulation/types';

function createBusyWaiterScene(counterCount = 4, waiterCount = 5): GameState {
  const state = createGame();
  state.width = 20;
  state.height = 20;
  state.spawnProgress = -10_000;
  state.employees = [];
  state.furniture = state.furniture.filter((item) => item.kind === 'door');
  for (let index = 0; index < counterCount; index += 1) {
    state.furniture.push({ id: `counter-${index + 1}`, kind: 'counter', position: { x: 1, y: 1 + index * 3 }, rotation: 0 });
  }
  for (let index = 0; index < waiterCount; index += 1) {
    state.employees.push({ id: `waiter-${index + 1}`, role: 'waiter', position: { x: 3, y: 1 + index * 3 }, energy: 100 });
  }
  for (let index = 0; index < 5; index += 1) {
    const y = 1 + index * 3;
    state.furniture.push(
      { id: `table-${index + 1}`, kind: 'table', position: { x: 10, y }, rotation: 0 },
      { id: `chair-${index + 1}`, kind: 'chair', position: { x: 10, y: y + 1 }, rotation: 0 },
    );
    state.customers.push({ id: `guest-${index + 1}`, position: { x: 10, y: y + 1 }, state: 'waitingFood', patience: 10_000, foodWait: 10_000, seatId: `chair-${index + 1}`, orderId: `order-${index + 1}` });
    state.orders.push({ id: `order-${index + 1}`, customerId: `guest-${index + 1}`, state: 'waitingDelivery', progress: 6, dishId: 'soup' });
  }
  return state;
}

function replenishReadyOrders(state: GameState): void {
  for (let index = 0; index < 5; index += 1) {
    const guest = state.customers.find((item) => item.id === `guest-${index + 1}`)!;
    const order = state.orders.find((item) => item.id === `order-${index + 1}`)!;
    if (order.state !== 'delivered') continue;
    guest.position = { x: 10, y: 2 + index * 3 };
    guest.state = 'waitingFood';
    guest.foodWait = 10_000;
    guest.seatId = `chair-${index + 1}`;
    guest.target = undefined;
    order.state = 'waitingDelivery';
    order.assignedTo = undefined;
    order.pickedUp = false;
  }
}

function runIdleRegression(state: GameState): { maxIdle: Record<string, number>; delivered: number } {
  const idle = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
  const maxIdle = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
  let delivered = 0;
  for (let tick = 0; tick < 300; tick += 1) {
    advanceSimulation(state, 1);
    delivered += state.orders.filter((order) => order.state === 'delivered').length;
    for (const waiter of state.employees) {
      const hasOrder = state.orders.some((order) => order.id === waiter.taskId);
      idle[waiter.id] = hasOrder ? 0 : idle[waiter.id] + 1;
      maxIdle[waiter.id] = Math.max(maxIdle[waiter.id], idle[waiter.id]);
    }
    replenishReadyOrders(state);
  }
  return { maxIdle, delivered };
}

describe('распределение официантов по стойкам', () => {
  it('пять официантов работают с четырьмя стойками при непрерывной очереди 300 тиков', () => {
    const state = createBusyWaiterScene();
    const metrics = Object.fromEntries(state.employees.map((waiter) => [waiter.id, { idle: 0, moving_to_counter: 0, carrying_order: 0, delivering: 0, waiting: 0 }]));
    const idleStreaks = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    const maxIdleStreaks = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    let readyTotal = 0;
    let readyMax = 0;
    let inFlightTotal = 0;
    let deliveredTotal = 0;
    for (let tick = 0; tick < 300; tick += 1) {
      const previous = new Map(state.employees.map((waiter) => [waiter.id, { ...waiter.position }]));
      advanceSimulation(state, 1);
      const ready = state.orders.filter((order) => order.state === 'waitingDelivery' && !order.pickedUp).length;
      readyTotal += ready;
      readyMax = Math.max(readyMax, ready);
      inFlightTotal += state.employees.filter((waiter) => state.orders.some((order) => order.id === waiter.taskId && order.state !== 'delivered')).length;
      deliveredTotal += state.orders.filter((order) => order.state === 'delivered').length;
      for (const waiter of state.employees) {
        const order = state.orders.find((item) => item.id === waiter.taskId);
        const moved = previous.get(waiter.id)?.x !== waiter.position.x || previous.get(waiter.id)?.y !== waiter.position.y;
        const bucket = !order ? 'idle' : order.pickedUp ? (moved ? 'delivering' : 'carrying_order') : moved ? 'moving_to_counter' : 'waiting';
        metrics[waiter.id][bucket] += 1;
        idleStreaks[waiter.id] = order ? 0 : idleStreaks[waiter.id] + 1;
        maxIdleStreaks[waiter.id] = Math.max(maxIdleStreaks[waiter.id], idleStreaks[waiter.id]);
      }
      replenishReadyOrders(state);
    }
    console.log('LOGIC-B1', JSON.stringify({ waiters: metrics, maxIdleStreaks, ready: { max: readyMax, avg: readyTotal / 300 }, inFlightAvg: inFlightTotal / 300, deliveredTotal }));
    expect(deliveredTotal).toBeGreaterThan(0);
    for (const streak of Object.values(maxIdleStreaks)) expect(streak).toBeLessThanOrEqual(2);
  });

  it('пять официантов используют четыре разные стойки вместо одной первой', () => {
    const state = createBusyWaiterScene();

    advanceSimulation(state, 1);

    for (let index = 0; index < 5; index += 1) {
      const waiter = state.employees.find((item) => item.id === `waiter-${index + 1}`)!;
      expect(waiter.position).toEqual(index < 4 ? { x: 2, y: 1 + index * 3 } : { x: 3, y: 11 });
      expect(waiter.taskId).toBe(`order-${index + 1}`);
    }
  });

  it('свободный официант в дальнем углу сам возвращается за готовым заказом', () => {
    const state = createBusyWaiterScene();
    const waiter = state.employees.find((item) => item.id === 'waiter-1')!;
    waiter.position = { x: 19, y: 19 };

    advanceSimulation(state, 1);

    expect(waiter.taskId).toBe('order-1');
    expect(waiter.position).not.toEqual({ x: 19, y: 19 });
  });

  it('эталон 5 официантов / 5 стоек: нет серии idle дольше одного такта за 300 тактов', () => {
    const result = runIdleRegression(createBusyWaiterScene(5, 5));

    expect(result.delivered).toBeGreaterThan(100);
    expect(result.maxIdle).toEqual({ 'waiter-1': 1, 'waiter-2': 1, 'waiter-3': 1, 'waiter-4': 1, 'waiter-5': 1 });
  });

  it('избыток стоек 4 официанта / 5 стоек: все четверо работают без зависания 300 тактов', () => {
    const result = runIdleRegression(createBusyWaiterScene(5, 4));

    expect(result.delivered).toBeGreaterThan(100);
    expect(result.maxIdle).toEqual({ 'waiter-1': 1, 'waiter-2': 1, 'waiter-3': 1, 'waiter-4': 1 });
  });

  it('5 официантов / 3 стойки: делят стойки и переключаются после добавления и удаления', () => {
    const state = createBusyWaiterScene(3, 5);
    const waiter = (index: number) => state.employees.find((item) => item.id === `waiter-${index}`)!;

    advanceSimulation(state, 1);
    expect(waiter(1).position).toEqual({ x: 2, y: 1 });
    expect(waiter(2).position).toEqual({ x: 2, y: 4 });
    expect(waiter(3).position).toEqual({ x: 2, y: 7 });
    expect(waiter(4).position).toEqual({ x: 3, y: 8 });
    expect(waiter(5).position).toEqual({ x: 3, y: 11 });

    state.furniture.push({ id: 'counter-4', kind: 'counter', position: { x: 1, y: 10 }, rotation: 0 });
    advanceSimulation(state, 1);
    expect(waiter(4).position).toEqual({ x: 2, y: 9 });

    const removalState = createBusyWaiterScene(3, 5);
    advanceSimulation(removalState, 1);
    removalState.furniture = removalState.furniture.filter((item) => item.id !== 'counter-2');
    advanceSimulation(removalState, 1);
    expect(removalState.employees.find((item) => item.id === 'waiter-2')?.position).toEqual({ x: 1, y: 5 });
    expect(removalState.orders.find((item) => item.id === 'order-2')?.pickedUp ?? false).toBe(false);
  });
});
