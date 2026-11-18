import { nextRandom } from './random';
import type { Employee, Furniture, GameState, Order } from './types';

export function serviceCounters(state: GameState): Furniture[] {
  return state.furniture.filter((item) => item.kind === 'counter');
}

export function counterForWaiter(state: GameState, waiter: Employee): Furniture | undefined {
  const counters = serviceCounters(state);
  if (!counters.length) return undefined;
  const waiters = state.employees.filter((employee) => employee.role === 'waiter');
  const index = waiters.findIndex((employee) => employee.id === waiter.id);
  return counters[Math.max(0, index) % counters.length];
}

/** Повар ставит готовое блюдо на случайную стойку выдачи. */
export function assignOrderToCounter(state: GameState, order: Order): Furniture | undefined {
  const counters = serviceCounters(state);
  if (!counters.length) {
    order.counterId = undefined;
    return undefined;
  }
  const counter = counters[Math.floor(nextRandom(state) * counters.length)];
  order.counterId = counter.id;
  return counter;
}

/** Сохраняет блюдо на стойке; после удаления стойки переносит ещё не взятое блюдо. */
export function ensureOrderCounter(state: GameState, order: Order): Furniture | undefined {
  const existing = serviceCounters(state).find((item) => item.id === order.counterId);
  if (existing) return existing;
  return assignOrderToCounter(state, order);
}
