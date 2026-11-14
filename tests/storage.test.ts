import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../src/persistence/localStorageAdapter';
import { createGame } from '../src/simulation/createGame';

describe('локальные сохранения', () => {
  it('сохраняет текущую игру и предыдущую резервную копию', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
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
    };
    const adapter = new LocalStorageAdapter(storage);
    adapter.save(createGame());
    values.set('moy-restoran:primary', '{broken');
    expect(adapter.load().coins).toBe(1000);
  });
});
