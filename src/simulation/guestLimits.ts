import type { GameState } from './types';

export const MAX_LEVEL = 33;
export const MAX_PURCHASED_SLOTS = 10;

export function levelGuestLimit(level: number): number {
  const normalized = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 7 + 5 * Math.floor(normalized / 5) + (normalized === MAX_LEVEL ? 3 : 0);
}

export function guestSlotPrice(count: number): number {
  return 2500 + 500 * count;
}

export function recalculateGuestLimit(state: GameState): void {
  state.maxGuestLimit = Math.max(state.maxGuestLimit ?? 0, state.guestLimit ?? 0,
    levelGuestLimit(state.level) + state.purchasedGuestSlots);
  state.guestLimit = state.maxGuestLimit;
}
