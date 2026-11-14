import type { GameState } from '../simulation/types';
import { processProgression } from '../simulation/progression';

export function normalizeState(state: GameState): GameState {
  state.randomSeed ??= 123456789;
  state.guestLimit ??= 7;
  state.level ??= 1;
  state.completedQuestIds ??= [];
  state.unlockedDishIds ??= ['soup'];
  state.servedTotal ??= 0;
  state.paidExpansions ??= 0;
  for (const customer of state.customers) {
    customer.foodWait ??= 120;
  }
  for (const order of state.orders) {
    order.dishId ??= 'soup';
  }
  processProgression(state);
  return state;
}
