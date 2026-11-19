import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { createGuestOrder } from '../src/simulation/orders';
import { delayedOrders, kitchenLayoutWarnings, ORDER_DELAY_TICKS, transitionOrder } from '../src/simulation/orderDiagnostics';
import { getHudModel } from '../src/simulation/selectors';
import { advanceSimulation } from '../src/simulation/tick';
import { normalizeState } from '../src/persistence/normalizeState';
import { kitchenDistance } from '../src/simulation/kitchen';
import type { Order } from '../src/simulation/types';

function order(state: Order['state'] = 'waitingCook'): Order {
  return { id: 'order-test', customerId: 'guest-test', state, progress: 0, dishId: 'soup' };
}

describe('диагностика состояний заказов', () => {
  it('записывает время только при реальной смене состояния', () => {
    const item = order('waitingWaiter');
    item.stateChangedAt = 4;
    transitionOrder(item, 'waitingWaiter', 10);
    expect(item.stateChangedAt).toBe(4);
    transitionOrder(item, 'takingOrder', 10);
    expect(item.stateChangedAt).toBe(10);
  });

  it('не сообщает о свежем заказе и объясняет задержку старше 30 тиков', () => {
    const state = createGame();
    state.tick = 10;
    state.orders.push({ ...order(), stateChangedAt: 0 });
    expect(delayedOrders(state)).toEqual([]);
    state.tick = ORDER_DELAY_TICKS;
    expect(delayedOrders(state)).toEqual([
      { id: 'order-test', state: 'waitingCook', age: ORDER_DELAY_TICKS, reason: 'Ожидает свободную плиту' },
    ]);
  });

  it('предупреждает об отсутствии стойки и о стойке вне рабочей зоны', () => {
    const state = createGame();
    expect(kitchenLayoutWarnings(state)).toContain('Выдача: не размещена стойка');
    state.furniture.push({ id: 'counter-far', kind: 'counter', position: { x: 7, y: 7 }, rotation: 0 });
    expect(kitchenLayoutWarnings(state)).toContain('Плита stove-1: все стойки вне рабочей зоны повара');
    state.furniture = state.furniture.filter((item) => item.kind !== 'stove');
    expect(kitchenLayoutWarnings(state)).toContain('Кухня: не размещена плита');
  });

  it('передаёт задержки и предупреждения планировки в модель HUD', () => {
    const state = createGame();
    state.tick = 40;
    state.orders.push({ ...order(), stateChangedAt: 0 });
    const model = getHudModel(state);
    expect(model.diagnostics.map((item) => item.id)).toEqual(['order-test']);
    expect(model.kitchenWarnings).toContain('Выдача: не размещена стойка');
  });

  it('восстанавливает повреждённое время состояния при загрузке', () => {
    const state = createGame();
    state.tick = 50;
    state.orders.push(
      { ...order(), stateChangedAt: Number.NaN },
      { ...order('cooking'), id: 'future', stateChangedAt: 100 },
      { ...order('takingOrder'), id: 'negative', stateChangedAt: -4 },
    );
    normalizeState(state);
    expect(state.orders.map((item) => item.stateChangedAt)).toEqual([50, 50, 0]);
  });
});

describe('инварианты кухни с несколькими поварами', () => {
  it('начисляет прогресс заказу один раз за тик независимо от числа поваров', () => {
    const state = createGame();
    state.arrivalProgress = -10_000;
    state.employees.push({ id: 'chef-2', role: 'chef', position: { x: 2, y: 3 }, energy: 100 });
    state.orders.push(order());
    advanceSimulation(state);
    expect(state.orders[0].progress).toBe(1);
    expect(state.orders[0].state).toBe('cooking');
  });

  it('два повара разносят разные готовые заказы без двойного назначения', () => {
    const state = createGame();
    state.arrivalProgress = -10_000;
    state.furniture.push(
      { id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 },
      { id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 },
      { id: 'counter-2', kind: 'counter', position: { x: 3, y: 2 }, rotation: 0 },
    );
    state.employees[0].position = { x: 2, y: 2 };
    state.employees.push({ id: 'chef-2', role: 'chef', position: { x: 4, y: 2 }, energy: 100 });
    state.orders.push(
      { ...order('cooking'), id: 'ready-1', progress: 6, stoveId: 'stove-1' },
      { ...order('cooking'), id: 'ready-2', progress: 6, stoveId: 'stove-2' },
    );
    advanceSimulation(state);
    expect(state.orders.map((item) => item.state)).toEqual(['waitingDelivery', 'waitingDelivery']);
    expect(new Set(state.orders.map((item) => item.id))).toEqual(new Set(['ready-1', 'ready-2']));
  });

  it('сохраняет владельца заказа, плиту, стойку и зону повара в полном цикле', () => {
    const state = createGame();
    state.arrivalProgress = -10_000;
    state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 3, y: 3 }, energy: 100 });
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
    const guest = { id: 'guest-1', position: { x: 5, y: 5 }, state: 'waitingFood' as const, patience: 10_000, foodWait: 10_000, seatId: 'chair-1' };
    state.customers.push(guest);
    const item = createGuestOrder(state, guest)!;

    for (let index = 0; index < 200 && item.state !== 'delivered'; index += 1) {
      advanceSimulation(state);
      const owners = state.employees.filter((employee) => employee.taskId === item.id && employee.role === 'waiter');
      expect(owners.length).toBeLessThanOrEqual(1);
      for (const stove of state.furniture.filter((furniture) => furniture.kind === 'stove')) {
        expect(state.orders.filter((candidate) => candidate.stoveId === stove.id && ['waitingCook', 'cooking'].includes(candidate.state)).length).toBeLessThanOrEqual(1);
      }
      for (const chef of state.employees.filter((employee) => employee.role === 'chef')) {
        expect(Math.min(...state.furniture.filter((furniture) => furniture.kind === 'stove').map((stove) => kitchenDistance(chef.position, stove.position)))).toBeLessThanOrEqual(2);
      }
      if (item.state === 'waitingDelivery') expect(state.furniture.some((furniture) => furniture.id === item.counterId)).toBe(true);
    }
    expect(item.state).toBe('delivered');
    expect(state.employees.some((employee) => employee.taskId === item.id)).toBe(false);
    expect(item.stateChangedAt).toBe(state.tick);
  });
});
