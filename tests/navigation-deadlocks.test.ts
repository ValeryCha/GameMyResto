import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';

describe('восстановление после блокировок навигации', () => {
  it('не создаёт нового гостя в занятой клетке двери', () => {
    const state = createGame();
    state.customers.push({ id: 'at-door', position: { x: 0, y: 7 }, state: 'seekingSeat', patience: 300 });

    advanceSimulation(state, 1);

    expect(state.customers).toHaveLength(1);
    expect(state.customers[0].id).toBe('at-door');
  });

  it('не резервирует стул, до которого нет маршрута', () => {
    const state = createGame();
    state.tick = 2;
    state.furniture.push(
      { id: 'wall-left', kind: 'plant', position: { x: 4, y: 5 }, rotation: 0 },
      { id: 'wall-top', kind: 'plant', position: { x: 5, y: 4 }, rotation: 0 },
      { id: 'wall-right', kind: 'plant', position: { x: 6, y: 5 }, rotation: 0 },
      { id: 'wall-bottom', kind: 'plant', position: { x: 5, y: 6 }, rotation: 0 },
      { id: 'table-free', kind: 'table', position: { x: 2, y: 4 }, rotation: 0 },
      { id: 'chair-free', kind: 'chair', position: { x: 2, y: 5 }, rotation: 0 },
    );
    state.customers.push({ id: 'arriving', position: { x: 0, y: 7 }, state: 'seekingSeat', patience: 300 });

    advanceSimulation(state, 1);

    expect(state.customers[0].seatId).toBe('chair-free');
    expect(state.customers[0].position).not.toEqual({ x: 0, y: 7 });
  });

  it('выводит гостя из двери в свободную зону ожидания, если мест нет', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => !['chair', 'table'].includes(item.kind));

    advanceSimulation(state, 1);

    expect(state.customers[0].position).not.toEqual({ x: 0, y: 7 });
    expect(state.customers[0].position).not.toEqual({ x: 0, y: 7 });
    advanceSimulation(state, 30);
    const doorwayGuests = state.customers.filter((guest) => guest.position.x === 0 && guest.position.y === 7);
    expect(doorwayGuests).toHaveLength(0);
  });

  it('проходит через уходящего гостя, не теряя бронь стула', () => {
    const state = createGame();
    state.tick = 2;
    const arriving = { id: 'arriving', position: { x: 1, y: 7 }, state: 'seekingSeat' as const, patience: 300, seatId: 'chair-1', target: { x: 5, y: 5 } };
    state.customers.push(
      arriving,
      { id: 'leaving', position: { x: 5, y: 5 }, state: 'leaving', patience: 0, target: { x: 0, y: 7 } },
    );

    advanceSimulation(state, 1);

    expect(arriving.position).toEqual({ x: 1, y: 5 });
    expect(arriving.seatId).toBe('chair-1');
    expect(arriving.target).toEqual({ x: 5, y: 5 });
  });

  it('освобождает официанта и заказ, если гость уже уходит', () => {
    const state = createGame();
    state.tick = 2;
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 0, y: 1 }, rotation: 0 });
    state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 0, y: 2 }, energy: 100, taskId: 'order-stale' });
    state.customers.push(
      { id: 'leaving', position: { x: 2, y: 7 }, state: 'leaving', patience: 0, target: { x: 0, y: 7 } },
      { id: 'served', position: { x: 5, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-1', orderId: 'order-next' },
    );
    state.orders.push(
      { id: 'order-stale', customerId: 'leaving', state: 'waitingDelivery', progress: 6, dishId: 'soup', assignedTo: 'waiter-1', pickedUp: true },
      { id: 'order-next', customerId: 'served', state: 'waitingDelivery', progress: 6, dishId: 'soup' },
    );

    advanceSimulation(state, 1);

    const stale = state.orders.find((order) => order.id === 'order-stale');
    expect(stale?.assignedTo).toBeUndefined();
    expect(stale?.pickedUp ?? false).toBe(false);
    expect(state.employees.find((employee) => employee.id === 'waiter-1')?.taskId).toBe('order-next');
  });

  it('освобождает официанта, если гость исчез из сохранения', () => {
    const state = createGame();
    state.tick = 2;
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 0, y: 1 }, rotation: 0 });
    state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 0, y: 2 }, energy: 100, taskId: 'order-missing' });
    state.orders.push({ id: 'order-missing', customerId: 'missing', state: 'waitingDelivery', progress: 6, dishId: 'soup', assignedTo: 'waiter-1', pickedUp: true });

    advanceSimulation(state, 1);

    expect(state.employees.find((employee) => employee.id === 'waiter-1')?.taskId).toBeUndefined();
    expect(state.orders[0].assignedTo).toBeUndefined();
    expect(state.orders[0].pickedUp).toBe(false);
  });
});
