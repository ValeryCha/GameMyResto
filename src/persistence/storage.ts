import type { GameState } from '../simulation/types';

export interface SaveEnvelope {
  schema: 1;
  savedAt: string;
  state: GameState;
}

export interface StorageAdapter {
  load(): GameState;
  save(state: GameState): void;
  reset(): void;
}
