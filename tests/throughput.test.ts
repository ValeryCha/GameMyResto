import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { DISHES } from '../src/content/dishes';
import { kitchenRate, seatRate, serviceRate, throughput, throughputMetrics, weightedCookTime } from '../src/simulation/throughput';

function addService(state: ReturnType<typeof createGame>): void {
  state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
  state.furniture.push({ id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
}

describe('throughput', () => {
  it('считает три звена и выбирает минимальное', () => {
    const state = createGame();
    addService(state);
    const metrics = throughputMetrics(state);
    expect(metrics.cookTime).toBe(6);
    expect(metrics.kitchenRate).toBeCloseTo(1 / 6);
    expect(metrics.serviceRate).toBeCloseTo(0.092);
    expect(metrics.seatRate).toBeCloseTo(1 / 18);
    expect(metrics.throughput).toBe(metrics.seatRate);
  });

  it('возвращает ноль без повара, плиты, официанта или стойки', () => {
    const state = createGame();
    expect(throughput(state)).toBe(0);
    addService(state);
    state.employees = state.employees.filter((employee) => employee.role !== 'chef');
    expect(kitchenRate(state)).toBe(0);
    expect(throughput(state)).toBe(0);
  });

  it('использует взвешенное T_cook доступного меню', () => {
    const state = createGame();
    state.unlockedDishIds = DISHES.map((dish) => dish.id);
    state.popularity = 500;
    expect(weightedCookTime(state)).toBeCloseTo(10.19, 2);
    state.unlockedDishIds = ['soup'];
    expect(weightedCookTime(state)).toBe(6);
  });

  it('учитывает прокачку кухни и официантов в расчёте, не меняя фактические функции движения', () => {
    const state = createGame();
    addService(state);
    state.upgrades.cooking = 5;
    state.upgrades.waiter = 5;
    expect(kitchenRate(state)).toBeCloseTo(1 / (6 * 0.6));
    expect(serviceRate(state)).toBeCloseTo(0.92 / (10 * 0.65));
  });

  it('ограничивает кухню тремя плитами и выдачу пятью линиями', () => {
    const state = createGame();
    for (let index = 0; index < 7; index += 1) {
      state.employees.push(
        { id: `chef-${index}`, role: 'chef', position: { x: 0, y: 0 }, energy: 100 },
        { id: `waiter-${index}`, role: 'waiter', position: { x: 0, y: 0 }, energy: 100 },
      );
      state.furniture.push(
        { id: `stove-${index}`, kind: 'stove', position: { x: 0, y: 0 }, rotation: 0 },
        { id: `counter-${index}`, kind: 'counter', position: { x: 0, y: 0 }, rotation: 0 },
      );
    }
    expect(kitchenRate(state)).toBeCloseTo(3 / 6);
    expect(serviceRate(state)).toBeCloseTo(0.46);
  });

  it('места учитывают минимум одну линию обслуживания в знаменателе', () => {
    const state = createGame();
    expect(seatRate(state)).toBeCloseTo(1 / 18);
  });

  it('линейно масштабирует seatRate по числу пригодных мест', () => {
    const state = createGame();
    state.furniture.push(
      { id: 'table-2', kind: 'table', position: { x: 3, y: 4 }, rotation: 0 },
      { id: 'chair-2', kind: 'chair', position: { x: 3, y: 5 }, rotation: 0 },
      { id: 'table-3', kind: 'table', position: { x: 1, y: 4 }, rotation: 0 },
      { id: 'chair-3', kind: 'chair', position: { x: 1, y: 5 }, rotation: 0 },
    );
    expect(seatRate(state)).toBeCloseTo(3 / 18);
  });

  it('даёт нулевой throughput без посадочных мест или доступных блюд', () => {
    const state = createGame();
    addService(state);
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(seatRate(state)).toBe(0);
    expect(throughput(state)).toBe(0);
    state.unlockedDishIds = [];
    expect(weightedCookTime(state)).toBe(0);
    expect(kitchenRate(state)).toBe(0);
  });
});
