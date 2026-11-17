import { furnitureCells } from './grid';
import type { Customer, Furniture, GameState } from './types';

export interface SeatAssignment {
  chair: Furniture;
  table: Furniture;
}

const adjacent = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

function tableForChair(state: GameState, chair: Furniture): Furniture | undefined {
  return state.furniture.find((item) =>
    (item.kind === 'table' || item.kind === 'tableDouble') &&
    furnitureCells(item).some((cell) => adjacent(cell, chair.position)));
}

export function findSeat(state: GameState, guest: Customer, canReserve?: (chair: Furniture) => boolean): SeatAssignment | undefined {
  for (const chair of state.furniture) {
    if (chair.kind !== 'chair') continue;
    if (state.customers.some((other) => other.id !== guest.id && other.seatId === chair.id)) continue;
    if (canReserve && !canReserve(chair)) continue;
    const table = tableForChair(state, chair);
    if (table) return { chair, table };
  }
  return undefined;
}

export function isSeatCurrent(state: GameState, guest: Customer): boolean {
  if (!guest.seatId) return false;
  const chair = state.furniture.find((item) => item.id === guest.seatId && item.kind === 'chair');
  return Boolean(chair && tableForChair(state, chair));
}
