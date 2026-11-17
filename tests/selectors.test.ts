import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { getHudModel } from '../src/simulation/selectors';

describe('модель HUD', () => {
  it('показывает рейтинг, цель, лимит и пиковый час', () => {
    const state = createGame();
    state.tick = 0;
    expect(getHudModel(state)).toMatchObject({
      coins: 1000,
      level: 1,
      popularity: '100',
      guests: 0,
      capacity: 1,
      arrivalsPer60: 0,
      peak: true,
      peakRemaining: 60,
    });
    state.tick = 60;
    expect(getHudModel(state).peak).toBe(false);
    expect(getHudModel(state).peakRemaining).toBe(120);
  });
});
