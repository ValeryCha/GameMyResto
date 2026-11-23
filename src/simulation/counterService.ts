import { nextRandom } from './random';
import type { Employee, Furniture, GameState, Order } from './types';

export const COUNTER_MAX_SLOTS = 3;

export function counterLoad(state: GameState, counterId: string): number {
  return state.orders.filter((order) => order.counterId === counterId && order.state === 'waitingDelivery').length;
}

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

/** Своя стойка имеет приоритет; при заполнении выбирается ближайшая к повару свободная. */
export function counterForChef(state: GameState, chef: Employee): Furniture | undefined {
  const counters = serviceCounters(state);
  if (!counters.length) return undefined;
  const chefs = state.employees.filter((employee) => employee.role === 'chef');
  const index = chefs.findIndex((employee) => employee.id === chef.id);
  const own = counters[Math.max(0, index) % counters.length];
  if (counterLoad(state, own.id) < COUNTER_MAX_SLOTS) return own;
  return counters
    .filter((counter) => counterLoad(state, counter.id) < COUNTER_MAX_SLOTS)
    .sort((a, b) =>
      Math.abs(a.position.x - chef.position.x) + Math.abs(a.position.y - chef.position.y) -
      Math.abs(b.position.x - chef.position.x) - Math.abs(b.position.y - chef.position.y))[0];
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
