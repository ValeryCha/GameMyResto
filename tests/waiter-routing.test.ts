import { expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';

it('официант обходит соседнего гостя и выбирает свободную клетку для подачи', () => {
  const state = createGame();
  state.tick = 2;
  state.furniture.push(
    { id: 'counter-1', kind: 'counter', position: { x: 0, y: 1 }, rotation: 0 },
    { id: 'table-2', kind: 'table', position: { x: 6, y: 4 }, rotation: 0 },
    { id: 'chair-2', kind: 'chair', position: { x: 6, y: 5 }, rotation: 0 },
  );
  state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 0, y: 2 }, energy: 100, taskId: 'order-2' });
  state.customers.push(
    { id: 'guest-1', position: { x: 5, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-1', orderId: 'order-1' },
    { id: 'guest-2', position: { x: 6, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-2', orderId: 'order-2' },
  );
  state.orders.push(
    { id: 'order-1', customerId: 'guest-1', state: 'waitingCook', progress: 0, dishId: 'soup' },
    { id: 'order-2', customerId: 'guest-2', state: 'waitingDelivery', progress: 6, dishId: 'soup', pickedUp: true, assignedTo: 'waiter-1' },
  );
  advanceSimulation(state, 1);
  expect(state.employees.find((employee) => employee.id === 'waiter-1')?.position).not.toEqual({ x: 0, y: 2 });
  advanceSimulation(state, 40);
  expect(state.orders.find((order) => order.id === 'order-2')?.state).toBe('delivered');
});
