import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { capacity, countUsableSeats, isPeakHour, patienceMultiplier, tipMultiplier } from '../src/simulation/guestFlow';

describe('базовые параметры потока гостей', () => {
  it('считает только стулья рядом со столом', () => {
    const state = createGame();
    expect(countUsableSeats(state)).toBe(1);
    expect(capacity(state)).toBe(1);
    state.furniture.push({ id: 'orphan', kind: 'chair', position: { x: 1, y: 6 }, rotation: 0 });
    expect(capacity(state)).toBe(1);
    state.furniture.push({ id: 'table-2', kind: 'table', position: { x: 1, y: 5 }, rotation: 0 });
    expect(capacity(state)).toBe(2);
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(capacity(state)).toBe(0);
  });

  it('сохраняет границы пикового часа', () => {
    expect(isPeakHour(0)).toBe(true);
    expect(isPeakHour(59)).toBe(true);
    expect(isPeakHour(60)).toBe(false);
    expect(isPeakHour(179)).toBe(false);
    expect(isPeakHour(180)).toBe(true);
  });

  it('повышает терпение и чаевые вместе с рейтингом без смены шкалы', () => {
    const state = createGame();
    state.popularity = 0;
    expect(patienceMultiplier(state)).toBe(0.85);
    expect(tipMultiplier(state)).toBe(1);
    state.popularity = 100;
    expect(patienceMultiplier(state)).toBe(1.15);
    expect(tipMultiplier(state)).toBe(1.2);
  });
});
