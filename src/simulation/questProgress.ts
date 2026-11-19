import { SIDE_QUESTS, type SideQuest, type DecorCategory } from '../content/sideQuests';
import { wallpaperById } from '../content/wallpapers';
import { floorPatternById } from '../content/floors';
import { paintingById } from '../content/paintings';
import { windowById } from '../content/windows';
import { furnitureSkinById } from '../content/furnitureSkins';
import type { GameState } from './types';
import { DAILY_QUESTS, type DailyQuest } from '../content/dailyQuests';

function sumDecorPrices(category: DecorCategory, state: GameState): number {
  switch (category) {
    case 'painting':
      return state.appliedPaintings.reduce(
        (sum, a) => sum + (paintingById(a.paintingId)?.price ?? 0), 0);
    case 'window':
      return state.appliedWindows.reduce(
        (sum, a) => sum + (windowById(a.windowId)?.price ?? 0), 0);
    case 'wallpaper':
      return Object.entries(state.ownedWallpapers).reduce(
        (sum, [id, count]) => sum + (wallpaperById(id)?.price ?? 0) * count, 0);
    case 'floor':
      return state.ownedFloorPatterns.reduce(
        (sum, id) => sum + (floorPatternById(id)?.price ?? 0), 0);
    case 'skin':
      return state.ownedFurnitureSkins.reduce(
        (sum, id) => sum + (furnitureSkinById(id)?.price ?? 0), 0);
    case 'plant':
    default:
      return 0;
  }
}

function calculateReward(quest: SideQuest, state: GameState): number {
  if (!quest.decorCategory || quest.decorCategory === 'plant') return quest.reward;
  const sum = sumDecorPrices(quest.decorCategory, state);
  return Math.min(quest.reward, Math.floor(sum * 0.8));
}

function isDependsSatisfied(state: GameState, dependsOn?: string): boolean {
  if (!dependsOn) return true;
  return state.completedSideQuestIds.includes(dependsOn)
      || state.completedQuestIds.includes(dependsOn);
}

export function processSideQuests(state: GameState): void {
  for (const quest of SIDE_QUESTS) {
    if (state.completedSideQuestIds.includes(quest.id)) continue;
    if (!isDependsSatisfied(state, quest.dependsOn)) continue;
    if (!quest.test(state)) continue;
    const reward = calculateReward(quest, state);
    state.completedSideQuestIds.push(quest.id);
    state.coins += reward;
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function selectDailyQuest(state: GameState): void {
  const today = todayKey();
  if (state.dailyQuestState.date === today) return;
  const index = hashString(`${today}:${state.randomSeed}`) % DAILY_QUESTS.length;
  const quest = DAILY_QUESTS[index];
  state.dailyQuestState = {
    date: today,
    id: quest.id,
    progress: quest.progress(state),
    rewarded: false,
  };
}

export function processDailyQuest(state: GameState): void {
  selectDailyQuest(state);
  if (state.dailyQuestState.rewarded) return;
  const quest = DAILY_QUESTS.find((q) => q.id === state.dailyQuestState.id);
  if (!quest) return;

  const current = quest.progress(state);
  const delta = Math.max(0, current - state.dailyQuestState.progress);

  if (delta >= quest.target) {
    state.dailyQuestState.rewarded = true;
    state.coins += quest.rewardCoins;
    state.experience += quest.rewardXp;
  }
}

export function recordPeakTotals(state: GameState, servedDelta: number): void {
  state.peakQuestTotals.servedTotal += servedDelta;
}