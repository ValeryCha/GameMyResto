import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { availableDishes, experienceThreshold, processProgression } from '../src/simulation/progression';
import { QUESTS } from '../src/content/quests';
import { placeFurniture } from '../src/simulation/commands';
import { hireWaiter } from '../src/simulation/shop';
import type { GameState } from '../src/simulation/types';

describe('уровни и блюда', () => {
  it('использует накопленные пороги 120, 360 и 720', () => {
    expect([experienceThreshold(1), experienceThreshold(2), experienceThreshold(3)]).toEqual([120, 360, 720]);
  });
  it('бесплатно расширяет только каждые пять уровней', () => {
    const state = createGame(); state.experience = 360; processProgression(state);
    expect(state.level).toBe(3); expect([state.width, state.height]).toEqual([8, 8]);
    state.experience = experienceThreshold(5) - 1; processProgression(state);
    expect(state.level).toBe(5); expect([state.width, state.height]).toEqual([10, 10]);
    expect(state.furniture.find((item) => item.id === 'table-1')?.position).toEqual({ x: 5, y: 4 });
  });
  it('ограничивает уровень 33 и не расширяет на нём', () => {
    const state = createGame(); state.experience = 999999; processProgression(state);
    expect(state.level).toBe(33); expect([state.width, state.height]).toEqual([20, 20]);
  });
  it('на первом уровне доступен только суп за 5', () => {
    expect(availableDishes(createGame()).map((dish) => [dish.id, dish.price])).toEqual([['soup', 5]]);
  });
  it('завершает старые сохранения безопасными полями', () => {
    const legacy = createGame() as Partial<GameState>; delete legacy.level;
    processProgression(legacy as GameState); expect(legacy.level).toBe(1);
  });
});

describe('задания без цепочек опыта', () => {
  it('содержит два стартовых и восемь основных заданий', () => {
    expect(QUESTS.map((quest) => quest.id)).toEqual(['quest-hire-waiter', 'quest-buy-counter', 'quest-1', 'quest-5', 'quest-10', 'quest-15', 'quest-20', 'quest-25', 'quest-30', 'quest-33']);
  });
  it('сначала засчитывает официанта, затем стойку и выдаёт награды один раз', () => {
    const state = createGame(); expect(placeFurniture(state, 'counter', { x: 3, y: 1 }).ok).toBe(true); processProgression(state);
    expect(state.completedQuestIds).toEqual([]); expect(hireWaiter(state).ok).toBe(true); processProgression(state);
    expect(state.completedQuestIds).toEqual(['quest-hire-waiter']); expect(state.coins).toBe(600); expect(state.experience).toBe(20);
    processProgression(state); expect(state.completedQuestIds).toEqual(['quest-hire-waiter', 'quest-buy-counter']);
    expect(state.coins).toBe(800); expect(state.experience).toBe(50);
  });
  it('основная награда не добавляет опыт и не вызывает цепочку уровней', () => {
    const state = createGame(); state.completedQuestIds = ['quest-hire-waiter', 'quest-buy-counter']; state.servedTotal = 1; const experience = state.experience;
    processProgression(state); expect(state.completedQuestIds).toContain('quest-1');
    expect(state.experience).toBe(experience); expect(state.level).toBe(1); expect(state.coins).toBe(1060);
  });
  it('проверяет условия мебели и рецептов', () => {
    const state = createGame(); state.level = 15;
    const tables = QUESTS.find((quest) => quest.id === 'quest-5')!;
    const recipes = QUESTS.find((quest) => quest.id === 'quest-15')!;
    expect(tables.test(state)).toBe(false); expect(recipes.test(state)).toBe(false);
    state.furniture.push({ id: 't2', kind: 'table', position: { x: 2, y: 4 }, rotation: 0 }, { id: 't3', kind: 'table', position: { x: 3, y: 4 }, rotation: 0 });
    state.unlockedDishIds.push('pasta', 'salad', 'cutlet', 'fish', 'signature');
    expect(tables.test(state)).toBe(true); expect(recipes.test(state)).toBe(true);
  });
});
