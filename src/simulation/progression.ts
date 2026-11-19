import { DISHES } from '../content/dishes';
import { QUESTS } from '../content/quests';
import { processSideQuests } from './questProgress';
import type { GameState } from './types';
import { expandBounds } from './expansion';
import { MAX_LEVEL, recalculateGuestLimit } from './guestLimits';

export const experienceThreshold = (level: number): number => 60 * level * (level + 1);

function ensureProgression(state: GameState): void {
  state.level ??= 1;
  state.completedQuestIds ??= [];
  state.unlockedDishIds ??= ['soup'];
  state.servedTotal ??= 0;
  state.paidExpansions ??= 0;
  state.purchasedGuestSlots ??= 0;
}

function applyLevels(state: GameState): void {
  while (state.level < MAX_LEVEL && state.experience >= experienceThreshold(state.level)) {
    state.level += 1;
    if (state.level % 5 === 0) expandBounds(state);
  }
  recalculateGuestLimit(state);
}

export function processProgression(state: GameState): void {
  ensureProgression(state);
  applyLevels(state);
  const quest = QUESTS.find((item) => item.level === state.level && !state.completedQuestIds.includes(item.id));
  if (quest && quest.test(state)) {
    state.completedQuestIds.push(quest.id);
    state.coins += quest.reward.coins;
    state.experience += quest.reward.experience;
    applyLevels(state);
  }
  processSideQuests(state);
}

export function availableDishes(state: GameState) {
  ensureProgression(state);
  return DISHES.filter((dish) => state.unlockedDishIds.includes(dish.id));
}
