import { DISHES } from '../content/dishes';
import { QUESTS } from '../content/quests';
import type { GameState } from './types';

export const experienceThreshold = (level: number): number => 50 * level * (level + 1);

function ensureProgression(state: GameState): void {
  state.level ??= 1;
  state.completedQuestIds ??= [];
  state.unlockedDishIds ??= ['soup'];
  state.servedTotal ??= 0;
  state.paidExpansions ??= 0;
}

function applyLevels(state: GameState): void {
  while (state.level < 30 && state.experience >= experienceThreshold(state.level)) {
    state.level += 1;
    state.width += 2;
    state.height += 2;
  }
}

export function processProgression(state: GameState): void {
  ensureProgression(state);
  applyLevels(state);
  const quest = QUESTS.find((item) => item.level === state.level);
  if (!quest || state.completedQuestIds.includes(`quest-${quest.level}`) || !quest.test(state)) return;
  state.completedQuestIds.push(`quest-${quest.level}`);
  state.coins += 100 * quest.level * quest.level;
  state.experience += 30 * quest.level;
  if (quest.unlockDishId && !state.unlockedDishIds.includes(quest.unlockDishId)) state.unlockedDishIds.push(quest.unlockDishId);
  applyLevels(state);
}

export function availableDishes(state: GameState) {
  ensureProgression(state);
  return DISHES.filter((dish) => state.unlockedDishIds.includes(dish.id));
}
