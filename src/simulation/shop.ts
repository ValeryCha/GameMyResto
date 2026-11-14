import type { CommandResult, GameState } from './types';

function spend(state: GameState, price: number, rating: number): boolean {
  if (state.coins < price) return false;
  state.coins -= price;
  state.popularity = Math.min(100, state.popularity + rating);
  return true;
}

export function addTestFunds(state: GameState): void {
  state.coins += 50000;
}

const insufficient = { ok: false as const, reason: 'Недостаточно монет' };

export function hireWaiter(state: GameState): CommandResult {
  if (!spend(state, 200, 10)) return insufficient;
  const id = `waiter-${state.tick}-${state.employees.length}`;
  state.employees.push({ id, role: 'waiter', position: { x: 2, y: 2 }, energy: 100 });
  return { ok: true };
}

export function increaseGuestLimit(state: GameState): CommandResult {
  if (!spend(state, 600, 3)) return insufficient;
  state.guestLimit += 1;
  return { ok: true };
}

export function expandRestaurant(state: GameState): CommandResult {
  if (!spend(state, 50000, 15)) return insufficient;
  state.width += 2;
  state.height += 2;
  state.paidExpansions += 1;
  return { ok: true };
}
