import { describe, expect, it } from 'vitest';
import { QUESTS } from '../src/content/quests';
import { createGame } from '../src/simulation/createGame';

describe('задания на ключевых рубежах', () => {
  const levels = [1, 5, 10, 15, 20, 25, 30, 33];
  it('содержит два стартовых и восемь основных заданий', () => {
    expect(QUESTS).toHaveLength(10);
    expect(QUESTS.slice(0, 2).map((quest) => quest.id)).toEqual(['quest-hire-waiter', 'quest-buy-counter']);
    expect(QUESTS.slice(2).map((quest) => quest.level)).toEqual(levels);
  });
  it('основные награды масштабируются монетами без опыта', () => {
    expect(QUESTS.every((quest) => quest.unlockDishId === undefined)).toBe(true);
    for (const level of levels) expect(QUESTS.find((quest) => quest.id === `quest-${level}`)?.reward).toEqual({ coins: 60 * level * level, experience: 0 });
  });
  it('проверяет новые проверяемые счётчики', () => {
    const state = createGame(); const test = (id: string) => QUESTS.find((quest) => quest.id === id)!.test(state);
    expect(test('quest-25')).toBe(false); state.purchasedGuestSlots = 3; expect(test('quest-25')).toBe(true);
    expect(test('quest-20')).toBe(false); state.revenueTotal = 2500; expect(test('quest-20')).toBe(true);
    expect(test('quest-33')).toBe(false); state.popularity = 85; state.servedTotal = 250; expect(test('quest-33')).toBe(true);
  });
  it('каждое задание имеет реальный предикат и денежную награду', () => {
    for (const quest of QUESTS) {
      expect(typeof quest.test(createGame())).toBe('boolean'); expect(quest.reward.coins).toBeGreaterThan(0);
      expect(quest.reward.experience).toBeGreaterThanOrEqual(0); expect(quest.title.length).toBeGreaterThan(2);
    }
  });
});
