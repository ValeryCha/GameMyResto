import { findPath, samePoint } from './grid';
import type { Customer, GameState, Point } from './types';

const entrance = { x: 0, y: 6 };
const chair = { x: 5, y: 5 };

function moveToward(state: GameState, actor: { position: Point; target?: Point }): boolean {
  if (!actor.target) return true;
  if (samePoint(actor.position, actor.target)) { actor.target = undefined; return true; }
  const path = findPath(state, actor.position, actor.target);
  if (path.length) actor.position = path[0];
  return path.length === 0;
}

function spawnCustomer(state: GameState): void {
  const id = `customer-${state.tick}`;
  const customer: Customer = { id, position: { ...entrance }, state: 'waiting', patience: 100, target: { ...chair } };
  state.customers.push(customer);
}

export function advanceSimulation(state: GameState, steps = 1): void {
  for (let i = 0; i < steps; i += 1) {
    state.tick += 1;
    if (state.tick % 45 === 1 && state.customers.length < 4) spawnCustomer(state);

    for (const employee of state.employees) employee.energy = Math.max(0, employee.energy - 0.002);

    for (const customer of state.customers) {
      if (customer.state === 'waiting' && moveToward(state, customer)) {
        customer.state = 'ordering';
        const orderId = `order-${customer.id}`;
        customer.orderId = orderId;
        state.orders.push({ id: orderId, customerId: customer.id, state: 'waitingCook', progress: 0 });
      }
      const order = state.orders.find((candidate) => candidate.id === customer.orderId);
      if (customer.state === 'ordering' && order) {
        order.state = 'cooking';
        customer.state = 'waitingFood';
      }
      if (customer.state === 'waitingFood' && order?.state === 'cooking') {
        order.progress += 1;
        if (order.progress >= 20) {
          order.state = 'delivered';
          customer.state = 'eating';
          customer.patience = 100;
        }
      }
      if (customer.state === 'eating') {
        customer.patience -= 2;
        if (customer.patience <= 0) {
          customer.state = 'leaving';
          customer.target = { ...entrance };
          state.coins += 20;
          state.experience += 10;
          state.popularity = Math.min(50, state.popularity + 0.1);
        }
      }
      if (customer.state === 'leaving' && moveToward(state, customer)) {
        state.customers = state.customers.filter((candidate) => candidate.id !== customer.id);
        state.orders = state.orders.filter((candidate) => candidate.customerId !== customer.id);
      }
    }
  }
}
