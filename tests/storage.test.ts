import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../src/persistence/localStorageAdapter';
import { createGame } from '../src/simulation/createGame';
import { normalizeState } from '../src/persistence/normalizeState';
import type { GameState } from '../src/simulation/types';

describe('локальные сохранения', () => {
  it('сохраняет текущую игру и предыдущую резервную копию', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const adapter = new LocalStorageAdapter(storage);
    adapter.save(createGame());
    const changed = createGame();
    changed.coins = 777;
    adapter.save(changed);
    expect(adapter.load().coins).toBe(777);
    expect(JSON.parse(values.get('moy-restoran:backup')!).state.coins).toBe(1000);
  });

  it('восстанавливает повреждённое основное сохранение из копии', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const adapter = new LocalStorageAdapter(storage);
    adapter.save(createGame());
    values.set('moy-restoran:primary', '{broken');
    expect(adapter.load().coins).toBe(1000);
  });

  it('старое сохранение получает новые поля без потери монет', () => {
    const legacy = createGame() as Partial<GameState>;
    delete legacy.randomSeed;
    delete legacy.guestLimit;
    legacy.coins = 777;
    const normalized = normalizeState(legacy as GameState);
    expect(normalized).toBe(legacy);
    expect(normalized.coins).toBe(777);
    expect(normalized.guestLimit).toBe(7);
    expect(normalized.randomSeed).toBe(123456789);
    expect(normalized.version).toBe(1);
  });

  it('полностью очищает основной и резервный прогресс', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const adapter = new LocalStorageAdapter(storage);
    const changed = createGame();
    changed.coins = 500;
    adapter.save(changed);
    adapter.reset();
    expect(values.has('moy-restoran:primary')).toBe(false);
    expect(values.has('moy-restoran:backup')).toBe(false);
    expect(adapter.load().coins).toBe(1000);
  });
});
