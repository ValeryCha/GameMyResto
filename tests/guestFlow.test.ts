import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import { hireWaiter } from '../src/simulation/shop';
import {
  countUsableSeats,
  customerSpawnInterval,
  isPeakHour,
  patienceMultiplier,
  targetGuestCount,
  tipMultiplier,
} from '../src/simulation/guestFlow';

describe('поток гостей', () => {
  it.each([[0, 7.14], [25, 6.07], [50, 5], [75, 3.93], [100, 2.86]])(
    'считает интервал для рейтинга %i вне пика', (popularity, expected) => {
      const state = createGame();
      state.tick = 60;
      hireWaiter(state);
      state.popularity = popularity;
      expect(customerSpawnInterval(state)).toBeCloseTo(expected, 2);
    },
  );

  it.each([[1, 6.5], [5, 5.6], [10, 5.28], [20, 4.64], [33, 3.81]])(
    'масштабирует интервал на уровне %i', (level, expected) => {
      const state = createGame();
      state.tick = 60;
      hireWaiter(state);
      state.level = level;
      state.popularity = 50;
      state.customers.push({ id: 'active', position: { x: 0, y: 7 }, state: 'seekingSeat', patience: 300 });
      state.customers.push({ id: 'target', position: { x: 0, y: 7 }, state: 'leaving', patience: 300 });
      // Целевая вместимость здесь равна четырём, поэтому заполненность 0,5.
      state.furniture.push(
        { id: 'c2', kind: 'chair', position: { x: 4, y: 4 }, rotation: 0 },
        { id: 'c3', kind: 'chair', position: { x: 6, y: 4 }, rotation: 0 },
      );
      expect(customerSpawnInterval(state)).toBeCloseTo(expected, 2);
    },
  );

  it('ускоряет поток на 25 процентов в пиковый час', () => {
    const state = createGame();
    state.tick = 60;
    state.popularity = 50;
    const normal = customerSpawnInterval(state);
    state.tick = 180;
    expect(customerSpawnInterval(state)).toBeCloseTo(normal * 0.75, 5);
    expect(isPeakHour(0)).toBe(true);
    expect(isPeakHour(59)).toBe(true);
    expect(isPeakHour(60)).toBe(false);
    expect(isPeakHour(180)).toBe(true);
  });

  it('сохраняет минимальный спрос даже без достаточного числа мест', () => {
    const state = createGame();
    expect(countUsableSeats(state)).toBe(1);
    expect(targetGuestCount(state)).toBe(4);
    hireWaiter(state); hireWaiter(state); hireWaiter(state);
    expect(targetGuestCount(state)).toBe(4);
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(countUsableSeats(state)).toBe(0);
    expect(targetGuestCount(state)).toBe(4);
    state.level = 33; state.guestLimit = 40;
    expect(targetGuestCount(state)).toBe(36);
  });

  it('не превышает целевую вместимость при длительной симуляции', () => {
    const state = createGame(); hireWaiter(state); advanceSimulation(state, 500);
    expect(state.customers.length).toBeLessThanOrEqual(targetGuestCount(state));
    expect(targetGuestCount(state)).toBe(4);
  });

  it('повышает терпение и чаевые вместе с рейтингом', () => {
    const state = createGame();
    state.popularity = 0;
    expect(patienceMultiplier(state)).toBe(0.85);
    expect(tipMultiplier(state)).toBe(1);
    state.popularity = 100;
    expect(patienceMultiplier(state)).toBe(1.15);
    expect(tipMultiplier(state)).toBe(1.2);
  });
});
