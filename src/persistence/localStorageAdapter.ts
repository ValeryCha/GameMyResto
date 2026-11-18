import { createGame } from '../simulation/createGame';
import { normalizeState } from './normalizeState';
import type { GameState } from '../simulation/types';
import type { SaveEnvelope, StorageAdapter } from './storage';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PRIMARY = 'moy-restoran:primary';
const BACKUP = 'moy-restoran:backup';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private storage: KeyValueStorage) {}

  load(): GameState {
    return this.read(PRIMARY) ?? this.read(BACKUP) ?? createGame();
  }

  save(state: GameState): void {
    const previous = this.read(PRIMARY);
    if (previous) this.storage.setItem(BACKUP, JSON.stringify(this.envelope(previous)));
    this.storage.setItem(PRIMARY, JSON.stringify(this.envelope(state)));
  }

  reset(): void {
    this.storage.removeItem(PRIMARY);
    this.storage.removeItem(BACKUP);
  }

  private read(key: string): GameState | null {
    const raw = this.storage.getItem(key);
    if (!raw) return null;
    try {
      const save = JSON.parse(raw) as SaveEnvelope;
      if (save.schema !== 1 || ![1, 2].includes(save.state?.version ?? 1)) return null;
      return normalizeState(save.state);
    } catch {
      return null;
    }
  }

  private envelope(state: GameState): SaveEnvelope {
    const { ratingHistory: _transientRatingHistory, editorMode: _transientEditorMode, ...persistentState } = state;
    return { schema: 1, savedAt: new Date().toISOString(), state: persistentState as GameState };
  }
}
