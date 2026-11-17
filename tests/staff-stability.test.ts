import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { placeFurniture } from '../src/simulation/commands';
import { hireWaiter } from '../src/simulation/shop';
import { advanceSimulation } from '../src/simulation/tick';
import { targetGuestCount } from '../src/simulation/guestFlow';

describe('устойчивость команды официантов', () => {
  for (const waiters of [2, 3, 5]) {
    it(`${waiters} официанта продолжают обслуживать гостей в длительной симуляции`, () => {
      const state = createGame();
      state.coins += 10_000;
      for (let count = 0; count < waiters; count += 1) hireWaiter(state);
      expect(placeFurniture(state, 'counter', { x: 2, y: 1 }).ok).toBe(true);
      // Тест проверяет официантов, а не перегрузку одного стула новой входной очередью.
      state.furniture.push(
        { id: 'table-stability-2', kind: 'table', position: { x: 3, y: 4 }, rotation: 0 },
        { id: 'chair-stability-2', kind: 'chair', position: { x: 3, y: 5 }, rotation: 0 },
        { id: 'table-stability-3', kind: 'table', position: { x: 1, y: 4 }, rotation: 0 },
        { id: 'chair-stability-3', kind: 'chair', position: { x: 1, y: 5 }, rotation: 0 },
      );

      advanceSimulation(state, 600);
      const servedBefore = state.servedTotal;
      advanceSimulation(state, 600);

      expect(state.servedTotal, JSON.stringify({ employees: state.employees, customers: state.customers, orders: state.orders.filter((order) => order.state !== 'delivered') })).toBeGreaterThan(servedBefore);
      expect(state.employees.filter((employee) => employee.role === 'waiter')).toHaveLength(waiters);
      // +1 допускает гостя в leaving, который ещё не удалён из customers после завершения тика.
      expect(state.customers.length).toBeLessThanOrEqual(targetGuestCount(state) + 1);
      expect(state.orders.length).toBeLessThanOrEqual(state.customers.length);
      for (const waiter of state.employees.filter((employee) => employee.role === 'waiter')) {
        const order = state.orders.find((item) => item.id === waiter.taskId);
        if (order) expect(state.customers.some((guest) => guest.id === order.customerId && guest.state !== 'leaving')).toBe(true);
      }
    });
  }

  it('удаляет завершённый заказ вместе с ушедшим гостем', () => {
    const state = createGame();
    state.tick = 2;
    state.customers.push({ id: 'leaving', position: { x: 0, y: 6 }, state: 'leaving', patience: 0, target: { x: 0, y: 6 } });
    state.orders.push({ id: 'completed', customerId: 'leaving', state: 'delivered', progress: 6, dishId: 'soup', assignedTo: 'waiter-old', pickedUp: true });

    advanceSimulation(state, 1);

    expect(state.customers.some((guest) => guest.id === 'leaving')).toBe(false);
    expect(state.orders.some((order) => order.id === 'completed')).toBe(false);
  });
});
