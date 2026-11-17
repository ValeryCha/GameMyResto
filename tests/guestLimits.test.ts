import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { guestSlotPrice, levelGuestLimit, recalculateGuestLimit } from '../src/simulation/guestLimits';
import { increaseGuestLimit } from '../src/simulation/shop';
import { normalizeState } from '../src/persistence/normalizeState';
import type { GameState } from '../src/simulation/types';

describe('лимит гостей', () => {
  it.each([[1, 7], [2, 7], [5, 12], [32, 37], [33, 40]])('уровень %i даёт %i мест', (level, expected) => {
    expect(levelGuestLimit(level)).toBe(expected);
  });

  it('даёт ровно десять покупок до 50 и прогрессивные цены', () => {
    const state = createGame();
    state.level = 33;
    state.coins = 100000;
    state.purchasedGuestSlots = 0;
    recalculateGuestLimit(state);
    const prices: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      prices.push(guestSlotPrice(state.purchasedGuestSlots));
      expect(increaseGuestLimit(state).ok).toBe(true);
    }
    expect(prices).toEqual([2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000]);
    expect(state.coins).toBe(52500);
    expect(state.purchasedGuestSlots).toBe(10);
    expect(state.guestLimit).toBe(50);
    expect(increaseGuestLimit(state)).toEqual({ ok: false, reason: 'Все дополнительные слоты куплены' });
  });

  it('мигрирует старый лимит один раз', () => {
    const legacy = createGame() as Partial<GameState>;
    legacy.level = 5;
    legacy.guestLimit = 10;
    delete legacy.purchasedGuestSlots;
    normalizeState(legacy as GameState);
    expect(legacy.purchasedGuestSlots).toBe(0);
    expect(legacy.guestLimit).toBe(12);
    normalizeState(legacy as GameState);
    expect(legacy.purchasedGuestSlots).toBe(0);
    expect(legacy.guestLimit).toBe(12);
  });
});
