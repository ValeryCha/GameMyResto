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
    expect(normalized.upgrades).toEqual({ cooking: 0, waiter: 0 });
    expect(normalized.lastDailyReward).toBe('');
    expect(normalized.version).toBe(1);
  });

  it('не выдаёт стартовые награды повторно в сохранении выше первого уровня', () => {
    const legacy = createGame();
    legacy.level = 3;
    legacy.experience = 300;
    legacy.coins = 777;
    normalizeState(legacy);
    expect(legacy.completedQuestIds).toEqual(
      expect.arrayContaining(['quest-hire-waiter', 'quest-buy-counter']),
    );
    expect(legacy.coins).toBe(777);
    expect(legacy.experience).toBe(300);
  });

  it('удаляет из старого сохранения завершённые заказы уже отсутствующих гостей', () => {
    const legacy = createGame();
    legacy.customers.push({ id: 'active', position: { x: 5, y: 5 }, state: 'eating', patience: 100, orderId: 'active-order' });
    legacy.orders.push(
      { id: 'orphan', customerId: 'gone', state: 'delivered', progress: 6, dishId: 'soup' },
      { id: 'active-order', customerId: 'active', state: 'delivered', progress: 6, dishId: 'soup' },
    );

    normalizeState(legacy);

    expect(legacy.orders.map((order) => order.id)).toEqual(['active-order']);
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
