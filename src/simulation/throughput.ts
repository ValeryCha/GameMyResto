import { availableDishes } from './progression';
import { capacity } from './guestFlow';
import type { GameState } from './types';

export interface ThroughputMetrics {
  cookTime: number;
  kitchenRate: number;
  serviceRate: number;
  seatRate: number;
  throughput: number;
}

const clampStaff = (value: number): number => Math.max(0, Math.min(5, value));

export function weightedCookTime(state: GameState): number {
  const dishes = availableDishes(state);
  if (!dishes.length) return 0;
  const rating = state.popularity / 100;
  const desiredWeights = dishes.map((dish) => 1 + rating * (dish.unlockLevel - 1));
  const desiredWeightTotal = desiredWeights.reduce((sum, weight) => sum + weight, 0);
  return dishes.reduce((sum, dish, index) => sum + dish.cookSeconds *
    (0.95 / dishes.length + 0.05 * desiredWeights[index] / desiredWeightTotal), 0);
}

export function kitchenRate(state: GameState): number {
  const chefs = clampStaff(state.employees.filter((employee) => employee.role === 'chef').length);
  const stoves = clampStaff(state.furniture.filter((item) => item.kind === 'stove').length);
  const cookTime = weightedCookTime(state);
  // У существующих скинов нет числовых кухонных бонусов; будущий суммарный бонус ограничивается 5%.
  const skinBonus = Math.min(0.05, 0);
  const cookTimeFactor = (1 - 0.08 * state.upgrades.cooking) * (1 - skinBonus);
  return cookTime > 0 && cookTimeFactor > 0 ? Math.min(chefs, stoves) / (cookTime * cookTimeFactor) : 0;
}

export function serviceRate(state: GameState): number {
  const waiters = clampStaff(state.employees.filter((employee) => employee.role === 'waiter').length);
  const counters = clampStaff(state.furniture.filter((item) => item.kind === 'counter').length);
  const waiterSpeed = 1 / (1 - 0.07 * state.upgrades.waiter);
  return 0.92 * Math.min(waiters, counters) * waiterSpeed / 10;
}

export function seatRate(state: GameState): number {
  const waiters = clampStaff(state.employees.filter((employee) => employee.role === 'waiter').length);
  const counters = clampStaff(state.furniture.filter((item) => item.kind === 'counter').length);
  return capacity(state) / (10 / Math.max(1, Math.min(waiters, counters)) + 8);
}

export function throughputMetrics(state: GameState): ThroughputMetrics {
  const kitchen = kitchenRate(state);
  const service = serviceRate(state);
  const seats = seatRate(state);
  return {
    cookTime: weightedCookTime(state),
    kitchenRate: kitchen,
    serviceRate: service,
    seatRate: seats,
    throughput: Math.min(kitchen, service, seats),
  };
}

export function throughput(state: GameState): number {
  return Math.min(kitchenRate(state), serviceRate(state), seatRate(state));
}
