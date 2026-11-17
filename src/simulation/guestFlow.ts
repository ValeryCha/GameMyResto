import { furnitureCells } from './grid';
import type { GameState } from './types';

const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

export function countUsableSeats(state: GameState): number {
  return state.furniture.filter((chair) => chair.kind === 'chair' && state.furniture.some((table) =>
    (table.kind === 'table' || table.kind === 'tableDouble') &&
    furnitureCells(table).some((cell) => adjacent(cell, chair.position)))).length;
}

export function targetGuestCount(state: GameState): number {
  const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
  return Math.min(state.guestLimit, Math.max(3 + state.level, countUsableSeats(state) + Math.min(2, waiters)));
}

export function isPeakHour(tick: number): boolean {
  return ((tick % 180) + 180) % 180 < 60;
}

export function customerSpawnInterval(state: GameState): number {
  const rating = state.popularity / 100;
  const level = (state.level - 1) / 32;
  const occupancy = state.customers.length / targetGuestCount(state);
  const chefs = state.employees.filter((employee) => employee.role === 'chef').length;
  const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
  const speed = 0.6 + 0.25 * chefs + 0.2 * waiters + 0.1 * state.upgrades.cooking + 0.1 * state.upgrades.waiter;
  const base = (7.5 - 4.5 * rating) * (1 - 0.35 * level) * (1 + 0.6 * occupancy) / speed;
  const regular = clamp(1.8, 9, base);
  return isPeakHour(state.tick) ? Math.max(1.8, regular * 0.75) : regular;
}

export const patienceMultiplier = (state: GameState): number => 0.85 + 0.3 * state.popularity / 100;
export const tipMultiplier = (state: GameState): number => 1 + 0.2 * state.popularity / 100;
