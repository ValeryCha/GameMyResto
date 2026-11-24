import { CHEF_RANGE, distanceToStove, stoveForChef } from './kitchen';
import type { Employee, Furniture, GameState, Order } from './types';

export const COUNTER_MAX_SLOTS = 3;

export function counterLoad(state: GameState, counterId: string): number {
  return state.orders.filter((order) => order.counterId === counterId && order.state === 'waitingDelivery').length;
}

/** Блюда, физически ожидающие официанта на стойке, в порядке размещения. */
export function counterPlateDishes(state: GameState, counterId: string): string[] {
  return state.orders
    .filter((order) => order.counterId === counterId && order.state === 'waitingDelivery' && !order.pickedUp && order.dishId)
    .slice(0, COUNTER_MAX_SLOTS)
    .map((order) => order.dishId!);
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

const byChefDistance = (chef: Employee, a: Furniture, b: Furniture) =>
  Math.abs(a.position.x - chef.position.x) + Math.abs(a.position.y - chef.position.y) -
  Math.abs(b.position.x - chef.position.x) - Math.abs(b.position.y - chef.position.y);

/** Наименее загруженная стойка; при равенстве выбирается ближайшая к повару. */
export function counterForChef(state: GameState, chef: Employee): Furniture | undefined {
  const stove = stoveForChef(state, chef);
  return serviceCounters(state)
    .filter((counter) => counterLoad(state, counter.id) < COUNTER_MAX_SLOTS &&
      (!stove || distanceToStove(state, counter.position, stove) <= CHEF_RANGE + 1))
    .sort((a, b) => counterLoad(state, a.id) - counterLoad(state, b.id) || byChefDistance(chef, a, b))[0];
}

/** Готовые блюда равномерно распределяются по стойкам с учётом их ёмкости. */
export function assignOrderToCounter(state: GameState, order: Order): Furniture | undefined {
  const counter = serviceCounters(state)
    .filter((candidate) => counterLoad(state, candidate.id) < COUNTER_MAX_SLOTS)
    .sort((a, b) => counterLoad(state, a.id) - counterLoad(state, b.id))[0];
  order.counterId = counter?.id;
  return counter;
}

/** Сохраняет блюдо на стойке; после удаления стойки переносит ещё не взятое блюдо. */
export function ensureOrderCounter(state: GameState, order: Order): Furniture | undefined {
  const existing = serviceCounters(state).find((item) => item.id === order.counterId);
  if (existing) return existing;
  return assignOrderToCounter(state, order);
}
