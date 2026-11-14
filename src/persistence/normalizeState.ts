import type { GameState } from '../simulation/types';

export function normalizeState(state: GameState): GameState {
  state.randomSeed ??= 123456789;
  state.guestLimit ??= 7;
  for (const customer of state.customers) {
    customer.foodWait ??= 120;
  }
  for (const order of state.orders) {
    order.dishId ??= 'soup';
  }
  return state;
}
