import type { GameState } from '../simulation/types';
import type { IconName } from '../ui/icons';

export interface Quest {
  id: string;
  level: number;
  title: string;
  description: string;
  icon: IconName;
  reward: { coins: number; experience: number };
  test(state: GameState): boolean;
  unlockDishId?: string;
}

export const STARTER_QUEST_IDS = ['quest-hire-waiter', 'quest-buy-counter'] as const;
const reward = (level: number) => ({ coins: 60 * level * level, experience: 0 });
const count = (state: GameState, kind: string) => state.furniture.filter((item) => item.kind === kind).length;
const tables = (state: GameState) => state.furniture.filter((item) => item.kind === 'table' || item.kind === 'tableDouble').length;
const waiters = (state: GameState) => state.employees.filter((item) => item.role === 'waiter').length;

const mainQuest = (
  level: number,
  title: string,
  description: string,
  test: (state: GameState) => boolean,
): Quest => ({ id: `quest-${level}`, level, title, description, icon: 'progress', reward: reward(level), test });

export const QUESTS: Quest[] = [
  {
    id: 'quest-hire-waiter', level: 1,
    title: 'Купить официанта', description: 'Наймите первого официанта', icon: 'waiter',
    reward: { coins: 100, experience: 20 },
    test: (state) => waiters(state) >= 1,
  },
  {
    id: 'quest-buy-counter', level: 1,
    title: 'Купить стойку выдачи заказов', description: 'Установите стойку выдачи заказов', icon: 'counter',
    reward: { coins: 200, experience: 30 },
    test: (state) => count(state, 'counter') >= 1,
  },
  mainQuest(1, 'Первый гость', 'Обслужите первого гостя', (state) => state.servedTotal >= 1),
  mainQuest(5, 'Больше столиков', 'Установите минимум 3 стола', (state) => tables(state) >= 3),
  mainQuest(10, 'Сильная команда', 'Наймите минимум 2 официантов', (state) => waiters(state) >= 2),
  mainQuest(15, 'Разнообразное меню', 'Купите не менее 6 рецептов', (state) => state.unlockedDishIds.length >= 6),
  mainQuest(20, 'Первая выручка', 'Заработайте 2500 монет с блюд', (state) => state.revenueTotal >= 2500),
  mainQuest(25, 'Резерв мест', 'Купите не менее 3 слотов', (state) => state.purchasedGuestSlots >= 3),
  mainQuest(30, 'Новые залы', 'Оплатите второе расширение', (state) => state.paidExpansions >= 2),
  mainQuest(33, 'Легенда города', 'Рейтинг 85 и 250 обслуженных гостей', (state) => state.popularity >= 85 && state.servedTotal >= 250),
];
