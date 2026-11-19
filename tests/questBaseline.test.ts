import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { normalizeState } from '../src/persistence/normalizeState';

const emptyBaseline = {
  servedTotal: 0, revenueTotal: 0, coins: 0, dishes: 0, skins: 0,
  wallpapers: 0, floors: 0, paintings: 0, windows: 0,
  waiters: 0, counters: 0, plants: 0, upgradeCooking: 0, upgradeWaiter: 0,
};

describe('questBaseline — миграция', () => {
  it('новый сейв получает нулевой baseline', () => {
    const state = createGame();
    expect(state.questBaseline).toEqual(emptyBaseline);
  });

  it('старый сейв получает baseline из текущих счётчиков', () => {
    const legacy = createGame();
    delete (legacy as Partial<typeof legacy>).questBaseline;
    legacy.servedTotal = 150;
    legacy.revenueTotal = 8000;
    legacy.coins = 500;
    normalizeState(legacy);
    expect(legacy.questBaseline.servedTotal).toBe(150);
    expect(legacy.questBaseline.revenueTotal).toBe(8000);
    expect(legacy.questBaseline.coins).toBe(500);
  });

  it('повторная нормализация не перезаписывает baseline', () => {
    const state = createGame();
    normalizeState(state);
    state.questBaseline.servedTotal = 50;
    state.servedTotal = 200;
    normalizeState(state);
    expect(state.questBaseline.servedTotal).toBe(50);
  });

  it('новые поля инициализируются без побочных эффектов', () => {
    const state = createGame();
    normalizeState(state);
    expect(state.completedSideQuestIds).toEqual([]);
    expect(state.dailyQuestState).toEqual({ date: '', id: '', progress: 0, rewarded: false });
    expect(state.peakQuestTotals).toEqual({ servedTotal: 0 });
  });
});