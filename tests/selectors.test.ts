import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { getHudModel, upgradeHint } from '../src/simulation/selectors';
import { DISHES } from '../src/content/dishes';

function addService(state: ReturnType<typeof createGame>): void {
  state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
  state.furniture.push({ id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
}

describe('модель HUD', () => {
  it('показывает рейтинг, места, поток, команду и пиковый час', () => {
    const state = createGame();
    state.tick = 0;
    expect(getHudModel(state)).toMatchObject({
      coins: 1000,
      level: 1,
      popularity: '100',
      guests: 0,
      occupiedSeats: 0,
      capacity: 1,
      queue: 0,
      arrivalsPer60: 0,
      throughputPer60: 0,
      ratingTrend: '→',
      team: { waiters: 0, counters: 0, chefs: 1, stoves: 1 },
      peak: true,
      peakRemaining: 60,
    });
    state.tick = 60;
    expect(getHudModel(state).peak).toBe(false);
    expect(getHudModel(state).peakRemaining).toBe(120);
  });

  it('считает тренд ровно за 60 тиков и не выдумывает прошлое', () => {
    const state = createGame();
    expect(getHudModel(state).ratingReason).toBe('нужно 60 тиков для сравнения');
    state.tick = 60;
    state.popularity = 102;
    expect(getHudModel(state)).toMatchObject({ ratingTrend: '↑', ratingDelta: 2 });
    state.popularity = 99;
    expect(getHudModel(state)).toMatchObject({ ratingTrend: '→', ratingDelta: -1 });
    state.popularity = 90;
    expect(getHudModel(state)).toMatchObject({ ratingTrend: '↓', ratingDelta: -10 });
  });

  it('показывает фактически занятые места и очередь отдельно', () => {
    const state = createGame();
    state.customers.push(
      { id: 'seated', position: { x: 5, y: 5 }, state: 'seated', patience: 10, seatId: 'chair-1' },
      { id: 'queued', position: { x: 0, y: 7 }, state: 'queueWaiting', patience: 10 },
    );
    state.guestQueue = ['queued'];
    expect(getHudModel(state)).toMatchObject({ guests: 2, occupiedSeats: 1, queue: 1 });
  });

  it('выбирает подсказку по минимальному звену с приоритетом мест', () => {
    const state = createGame();
    expect(upgradeHint(state).bottleneck).toBe('service'); // Без официанта и стойки выдача равна нулю.
    addService(state);
    expect(upgradeHint(state).bottleneck).toBe('seats');
    state.upgrades.waiter = 5;
    state.unlockedDishIds = DISHES.map((dish) => dish.id);
    for (let index = 0; index < 3; index += 1) {
      state.furniture.push(
        { id: `table-${index}`, kind: 'table', position: { x: 3 + index, y: 3 }, rotation: 0 },
        { id: `chair-${index}`, kind: 'chair', position: { x: 3 + index, y: 4 }, rotation: 0 },
      );
    }
    expect(upgradeHint(state).bottleneck).toBe('kitchen');
    state.upgrades.cooking = 5;
    expect(upgradeHint(state).bottleneck).toBe('service');
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(upgradeHint(state).text).toContain('добавьте стул');
  });
});
