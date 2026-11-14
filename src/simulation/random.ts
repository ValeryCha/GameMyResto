import type { GameState } from './types';

export function nextRandom(state: GameState): number {
  state.randomSeed = (state.randomSeed * 1664525 + 1013904223) >>> 0;
  return state.randomSeed / 2 ** 32;
}
