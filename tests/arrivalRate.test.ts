import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { DISHES } from '../src/content/dishes';
import { arrivalRate, capacity, levelDemand, occupancyFactor, ratingFactor, slotDemand } from '../src/simulation/guestFlow';
import { throughput } from '../src/simulation/throughput';
import type { GameState } from '../src/simulation/types';

function highThroughput(state: GameState): void {
  for (let index = 1; index < 5; index += 1) {
    state.employees.push({ id: `chef-${index}`, role: 'chef', position: { x: 0, y: 0 }, energy: 100 });
    state.furniture.push({ id: `stove-${index}`, kind: 'stove', position: { x: 0, y: 0 }, rotation: 0 });
  }
  for (let index = 0; index < 5; index += 1) {
    state.employees.push({ id: `waiter-${index}`, role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
    state.furniture.push({ id: `counter-${index}`, kind: 'counter', position: { x: 0, y: 0 }, rotation: 0 });
  }
  for (let index = 0; index < 10; index += 1) {
    state.furniture.push(
      { id: `table-${index}`, kind: 'table', position: { x: index * 2, y: 0 }, rotation: 0 },
      { id: `chair-${index}`, kind: 'chair', position: { x: index * 2, y: 1 }, rotation: 0 },
    );
  }
}

describe('arrivalRate', () => {
  it('считает спрос уровня, слотов и рейтинга на шкале 0–1000', () => {
    const state = createGame();
    state.level = 33;
    state.purchasedGuestSlots = 10;
    state.popularity = 500;
    expect(levelDemand(state)).toBeCloseTo(0.504);
    expect(slotDemand(state)).toBeCloseTo(0.3);
    expect(ratingFactor(state)).toBe(1);
    state.popularity = 0;
    expect(ratingFactor(state)).toBe(0.75);
    state.popularity = 1000;
    expect(ratingFactor(state)).toBe(1.25);
  });

  it('применяет occupancyFactor к фактической вместимости', () => {
    const state = createGame();
    highThroughput(state);
    expect(capacity(state)).toBe(11);
    expect(occupancyFactor(state)).toBe(1);
    state.customers.push({ id: 'guest', position: { x: 0, y: 7 }, state: 'eating', patience: 100 });
    expect(occupancyFactor(state)).toBeCloseTo(1 / (1 + 0.6 / 11));
  });

  it('умножает исходный спрос на 1.5 в пик', () => {
    const state = createGame();
    highThroughput(state);
    state.popularity = 500;
    state.tick = 60;
    expect(arrivalRate(state)).toBeCloseTo(0.12);
    state.tick = 0;
    expect(arrivalRate(state)).toBeCloseTo(0.18);
  });

  it('учитывает купленные слоты до общего капа', () => {
    const state = createGame();
    highThroughput(state);
    state.popularity = 500;
    state.tick = 60;
    state.purchasedGuestSlots = 10;
    expect(arrivalRate(state)).toBeCloseTo(0.42);
  });

  it('ограничивает спрос значением throughput × 1.3', () => {
    const state = createGame();
    state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
    state.furniture.push({ id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
    state.popularity = 1000;
    expect(arrivalRate(state)).toBeCloseTo(throughput(state) * 1.3);
  });

  it('полностью останавливает приход при нулевом throughput', () => {
    const state = createGame();
    state.purchasedGuestSlots = 10;
    expect(throughput(state)).toBe(0);
    expect(arrivalRate(state)).toBe(0);
  });

  it('фиксирует приёмочные кейсы 1/1/1/1 с тремя стульями', () => {
    const state = createGame();
    state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
    state.furniture.push(
      { id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 },
      { id: 'table-2', kind: 'table', position: { x: 2, y: 4 }, rotation: 0 },
      { id: 'chair-2', kind: 'chair', position: { x: 2, y: 5 }, rotation: 0 },
      { id: 'table-3', kind: 'table', position: { x: 4, y: 4 }, rotation: 0 },
      { id: 'chair-3', kind: 'chair', position: { x: 4, y: 5 }, rotation: 0 },
    );
    state.popularity = 500;
    state.tick = 60;
    expect(capacity(state)).toBe(3);
    expect(arrivalRate(state)).toBeCloseTo(0.1196); // raw 0.12 → кап 0.092 × 1.3.

    state.level = 33;
    state.purchasedGuestSlots = 10;
    state.unlockedDishIds = DISHES.map((dish) => dish.id);
    state.tick = 0;
    expect(arrivalRate(state)).toBeCloseTo(0.1196); // raw 1.206 → тот же кап доставки.
  });
});
