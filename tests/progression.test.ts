import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { availableDishes, experienceThreshold, processProgression } from '../src/simulation/progression';
import { QUESTS } from '../src/content/quests';
import type { GameState } from '../src/simulation/types';

function ready(level: number): GameState {
  const state = createGame();
  state.level = level;
  state.experience = level > 1 ? 50 * (level - 1) * level : 0;
  return state;
}

describe('уровни и блюда', () => {
  it('использует накопленные пороги 100, 300 и 600', () => {
    expect([experienceThreshold(1), experienceThreshold(2), experienceThreshold(3)]).toEqual([100, 300, 600]);
  });

  it('бесплатно расширяет за каждый уровень и не двигает мебель', () => {
    const state = createGame();
    state.experience = 300;
    processProgression(state);
    expect(state.level).toBe(3);
    expect([state.width, state.height]).toEqual([12, 12]);
    expect(state.furniture.find((item) => item.id === 'table-1')?.position).toEqual({ x: 5, y: 4 });
  });

  it('ограничивает уровень 30', () => {
    const state = createGame();
    state.experience = 999999;
    processProgression(state);
    expect(state.level).toBe(30);
    expect([state.width, state.height]).toEqual([66, 66]);
  });

  it('на первом уровне доступен только суп за 5', () => {
    expect(availableDishes(createGame()).map((dish) => [dish.id, dish.price])).toEqual([['soup', 5]]);
  });

  it('завершает старые сохранения безопасными полями', () => {
    const legacy = createGame() as Partial<GameState>;
    delete legacy.level;
    processProgression(legacy as GameState);
    expect(legacy.level).toBe(1);
  });
});

describe('задания и масштабированные награды', () => {
  it('содержит ровно 10 проверяемых заданий', () => {
    expect(QUESTS.map((quest) => quest.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('выдаёт награду один раз и открывает пасту на уровне 2', () => {
    const state = ready(2);
    state.servedTotal = 3;
    const coins = state.coins;
    processProgression(state);
    expect(state.experience).toBe(160);
    expect(state.coins).toBe(coins + 400);
    expect(state.unlockedDishIds).toContain('pasta');
    processProgression(state);
    expect(state.coins).toBe(coins + 400);
  });

  it('проверяет условия заданий текущей мебели и счётчиков', () => {
    const state = ready(3);
    expect(QUESTS[2].test(state)).toBe(false);
    state.furniture.push(
      { id: 'c2', kind: 'chair', position: { x: 4, y: 5 }, rotation: 0 },
      { id: 'c3', kind: 'chair', position: { x: 6, y: 5 }, rotation: 0 },
    );
    expect(QUESTS[2].test(state)).toBe(true);
    expect(QUESTS[5].test(state)).toBe(false);
    state.furniture.push({ id: 'double', kind: 'tableDouble', position: { x: 2, y: 6 }, rotation: 0 });
    expect(QUESTS[5].test(state)).toBe(true);
  });
});
