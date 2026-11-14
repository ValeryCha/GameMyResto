import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { placeFurniture } from '../src/simulation/commands';

describe('placeFurniture', () => {
  it('charges exactly once and adds a plant', () => {
    const state = createGame();
    expect(placeFurniture(state, 'plant', { x: 3, y: 2 })).toEqual({ ok: true });
    expect(state.coins).toBe(950);
    expect(state.furniture.filter((item) => item.kind === 'plant')).toHaveLength(1);
  });

  it('rejects occupied cells without charging', () => {
    const state = createGame();
    expect(placeFurniture(state, 'plant', { x: 1, y: 1 })).toEqual({ ok: false, reason: 'Клетка занята' });
    expect(state.coins).toBe(1_000);
  });

  it('rejects unaffordable purchases without changing state', () => {
    const state = createGame();
    state.coins = 49;
    expect(placeFurniture(state, 'plant', { x: 3, y: 2 })).toEqual({ ok: false, reason: 'Недостаточно монет' });
    expect(state.furniture).toHaveLength(4);
  });
});
