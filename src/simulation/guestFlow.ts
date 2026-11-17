import { furnitureCells } from './grid';
import { throughput } from './throughput';
import type { GameState } from './types';

const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export function countUsableSeats(state: GameState): number {
  return state.furniture.filter((chair) => chair.kind === 'chair' && state.furniture.some((table) =>
    (table.kind === 'table' || table.kind === 'tableDouble') &&
    furnitureCells(table).some((cell) => adjacent(cell, chair.position)))).length;
}

export const capacity = (state: GameState): number => countUsableSeats(state);

export function levelDemand(state: GameState): number {
  return 0.12 + 0.012 * (state.level - 1);
}

export function slotDemand(state: GameState): number {
  return 0.03 * state.purchasedGuestSlots;
}

export function ratingFactor(state: GameState): number {
  return 0.75 + 0.50 * state.popularity / 100;
}

export function occupancyFactor(state: GameState): number {
  const occupied = state.customers.length;
  return 1 / (1 + 0.6 * occupied / Math.max(1, capacity(state)));
}

export function arrivalRate(state: GameState): number {
  const peakFactor = isPeakHour(state.tick) ? 1.5 : 1;
  const raw = (levelDemand(state) + slotDemand(state))
    * ratingFactor(state)
    * peakFactor
    * occupancyFactor(state);
  return Math.min(raw, throughput(state) * 1.3);
}

export function isPeakHour(tick: number): boolean {
  return ((tick % 180) + 180) % 180 < 60;
}

export const patienceMultiplier = (state: GameState): number => 0.85 + 0.3 * state.popularity / 100;
export const tipMultiplier = (state: GameState): number => 1 + 0.2 * state.popularity / 100;
