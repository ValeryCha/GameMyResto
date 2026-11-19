import type { GameState } from '../simulation/types';
import type { IconName } from '../ui/icons';

export type DecorCategory = 'painting' | 'window' | 'wallpaper' | 'floor' | 'plant' | 'skin';

export interface SideQuest {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  reward: number;
  test(state: GameState): boolean;
  dependsOn?: string;
  decorCategory?: DecorCategory;
}

const waitersCount = (state: GameState): number =>
  state.employees.filter((e) => e.role === 'waiter').length;

const countersCount = (state: GameState): number =>
  state.furniture.filter((f) => f.kind === 'counter').length;

const plantsCount = (state: GameState): number =>
  state.furniture.filter((f) => f.kind === 'plant').length;

const wallpapersCount = (state: GameState): number =>
  Object.keys(state.ownedWallpapers).length;

export const SIDE_QUESTS: SideQuest[] = [
  // ── Декор ──
  {
    id: 'decor-painting',
    title: 'Искусство на стене',
    description: 'Разместите первую картину',
    icon: 'decor',
    reward: 200,
    decorCategory: 'painting',
    test: (state) => state.appliedPaintings.length - state.questBaseline.paintings >= 1,
  },
  {
    id: 'decor-windows',
    title: 'Больше света',
    description: 'Разместите 3 окна',
    icon: 'decor',
    reward: 900,
    decorCategory: 'window',
    dependsOn: 'decor-painting',
    test: (state) => state.appliedWindows.length - state.questBaseline.windows >= 3,
  },
  {
    id: 'decor-plant',
    title: 'Живой уголок',
    description: 'Купите первое растение',
    icon: 'plant',
    reward: 300,
    decorCategory: 'plant',
    test: (state) => plantsCount(state) - state.questBaseline.plants >= 1,
  },
  {
    id: 'decor-wallpapers',
    title: 'Три настроения',
    description: 'Откройте 3 вида обоев',
    icon: 'decor',
    reward: 600,
    decorCategory: 'wallpaper',
    test: (state) => wallpapersCount(state) - state.questBaseline.wallpapers >= 3,
  },
  {
    id: 'decor-floors',
    title: 'Новое покрытие',
    description: 'Откройте 3 покрытия пола',
    icon: 'decor',
    reward: 600,
    decorCategory: 'floor',
    dependsOn: 'decor-wallpapers',
    test: (state) => state.ownedFloorPatterns.length - state.questBaseline.floors >= 3,
  },
  {
    id: 'decor-skins-3',
    title: 'Свой стиль',
    description: 'Откройте 3 скина мебели',
    icon: 'decor',
    reward: 900,
    decorCategory: 'skin',
    dependsOn: 'decor-painting',
    test: (state) => state.ownedFurnitureSkins.length - state.questBaseline.skins >= 3,
  },
  {
    id: 'decor-skins-5',
    title: 'Коллекционер',
    description: 'Откройте 5 скинов мебели',
    icon: 'decor',
    reward: 2000,
    decorCategory: 'skin',
    dependsOn: 'decor-skins-3',
    test: (state) => state.ownedFurnitureSkins.length - state.questBaseline.skins >= 5,
  },

  // ── Экономика ──
  {
    id: 'economy-revenue',
    title: 'Устойчивая выручка',
    description: 'Заработайте 5000 монет с блюд',
    icon: 'rating',
    reward: 1500,
    dependsOn: 'quest-1',
    test: (state) => state.revenueTotal - state.questBaseline.revenueTotal >= 5000,
  },
  {
    id: 'economy-savings',
    title: 'Запас прочности',
    description: 'Накопите 10 000 монет',
    icon: 'rating',
    reward: 1000,
    dependsOn: 'economy-revenue',
    test: (state) => state.coins >= 10000,
  },
  {
    id: 'economy-cooking',
    title: 'Горячий цех',
    description: 'Прокачайте кухню до 3 уровня',
    icon: 'kitchen',
    reward: 1800,
    test: (state) => state.upgrades.cooking >= 3,
  },
  {
    id: 'economy-waiter',
    title: 'Быстрая подача',
    description: 'Прокачайте официантов до 3 уровня',
    icon: 'waiter',
    reward: 2000,
    dependsOn: 'quest-10',
    test: (state) => state.upgrades.waiter >= 3,
  },

  // ── Команда ──
  {
    id: 'team-waiters-3',
    title: 'Слаженная смена',
    description: 'Наймите 3 официантов',
    icon: 'waiter',
    reward: 1500,
    dependsOn: 'quest-10',
    test: (state) => waitersCount(state) >= 3,
  },
  {
    id: 'team-counters-3',
    title: 'Три линии выдачи',
    description: 'Установите 3 стойки',
    icon: 'counter',
    reward: 1500,
    dependsOn: 'team-waiters-3',
    test: (state) => countersCount(state) >= 3,
  },
  {
    id: 'team-full-5',
    title: 'Полная выдача',
    description: '5 официантов и 5 стоек одновременно',
    icon: 'counter',
    reward: 5000,
    dependsOn: 'team-counters-3',
    test: (state) => waitersCount(state) >= 5 && countersCount(state) >= 5,
  },

  // ── Меню ──
  {
    id: 'menu-recipes-3',
    title: 'Три блюда',
    description: 'Откройте 3 рецепта',
    icon: 'recipe',
    reward: 800,
    test: (state) => state.unlockedDishIds.length >= 3,
  },

  // ── Пики ──
  {
    id: 'peak-eight',
    title: 'Горячий час',
    description: 'Обслужите 8 гостей за один пик',
    icon: 'progress',
    reward: 1000,
    test: (state) => (state.peakState.last?.served ?? 0) >= 8,
  },
  {
    id: 'peak-perfect',
    title: 'Без жалоб',
    description: 'Идеальный пик с 5+ гостями',
    icon: 'progress',
    reward: 2500,
    dependsOn: 'peak-eight',
    test: (state) =>
      state.peakState.last?.perfect === true && (state.peakState.last?.served ?? 0) >= 5,
  },
  {
    id: 'peak-twenty',
    title: 'Мастер наплыва',
    description: 'Обслужите 20 гостей в пики (суммарно)',
    icon: 'progress',
    reward: 4000,
    dependsOn: 'peak-perfect',
    test: (state) => state.peakQuestTotals.servedTotal >= 20,
  },
];