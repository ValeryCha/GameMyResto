import type { GameState } from '../simulation/types';
import type { IconName } from '../ui/icons';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  rewardCoins: number;
  rewardXp: number;
  target: number;
  progress(state: GameState): number;
}

export const DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'daily-serve-5',
    title: 'Пять счастливых гостей',
    description: 'Обслужить 5 гостей за день',
    icon: 'guest',
    rewardCoins: 150,
    rewardXp: 20,
    target: 5,
    progress: (state) => state.servedTotal,
  },
  {
    id: 'daily-revenue-300',
    title: 'Дневная выручка',
    description: 'Заработать 300 монет с блюд',
    icon: 'coin',
    rewardCoins: 150,
    rewardXp: 20,
    target: 300,
    progress: (state) => state.revenueTotal,
  },
  {
    id: 'daily-decor-1',
    title: 'Обновление интерьера',
    description: 'Применить новый декор',
    icon: 'decor',
    rewardCoins: 100,
    rewardXp: 15,
    target: 1,
    progress: (state) =>
      state.appliedPaintings.length +
      state.appliedWindows.length +
      state.appliedWallpapers.length +
      state.ownedFloorPatterns.length +
      state.ownedFurnitureSkins.length,
  },
  {
    id: 'daily-peak-serve-5',
    title: 'Пиковая пятёрка',
    description: 'Обслужить 5 гостей в одном пике',
    icon: 'peak',
    rewardCoins: 300,
    rewardXp: 30,
    target: 5,
    progress: (state) => state.peakQuestTotals.servedTotal,
  },
  {
    id: 'daily-peak-perfect-1',
    title: 'Без отказов',
    description: 'Пик без queueRejected и queueTimeout',
    icon: 'star',
    rewardCoins: 400,
    rewardXp: 40,
    target: 1,
    progress: (state) => state.peakQuestTotals.perfectPeaksTotal,
  },
  {
    id: 'daily-serve-10',
    title: 'Большой заказ',
    description: 'Обслужить 10 гостей за день',
    icon: 'guest',
    rewardCoins: 500,
    rewardXp: 50,
    target: 10,
    progress: (state) => state.servedTotal,
  },
];