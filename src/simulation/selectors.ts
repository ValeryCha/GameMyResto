import type { GameState } from './types';
export function getHudModel(state: GameState) {
  return { coins: state.coins, experience: state.experience, level: state.level, popularity: state.popularity.toFixed(1), guests: state.customers.length };
}
