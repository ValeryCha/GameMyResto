import type { GameState } from '../simulation/types';

export interface Quest {
  level: number;
  title: string;
  description: string;
  test(state: GameState): boolean;
  unlockDishId?: string;
}

export const QUESTS: Quest[] = [
  { level: 1, title: 'Первый гость', description: 'Обслужите первого гостя', test: (s) => s.servedTotal >= 1 },
  { level: 2, title: 'Новый рецепт', description: 'Обслужите ещё двух гостей', test: (s) => s.servedTotal >= 3, unlockDishId: 'pasta' },
  { level: 3, title: 'Больше мест', description: 'Установите минимум 3 стула', test: (s) => s.furniture.filter((item) => item.kind === 'chair').length >= 3 },
  { level: 4, title: 'Узнаваемый ресторан', description: 'Достигните рейтинга 20', test: (s) => s.popularity >= 20, unlockDishId: 'salad' },
  { level: 5, title: 'Больше столиков', description: 'Установите минимум 3 стола', test: (s) => s.furniture.filter((item) => item.kind === 'table' || item.kind === 'tableDouble').length >= 3 },
  { level: 6, title: 'Большой стол', description: 'Установите стол 2×1', test: (s) => s.furniture.some((item) => item.kind === 'tableDouble'), unlockDishId: 'cutlet' },
  { level: 7, title: 'Напряжённый день', description: 'Обслужите всего 15 гостей', test: (s) => s.servedTotal >= 15 },
  { level: 8, title: 'Сильная команда', description: 'Наймите минимум 2 официантов', test: (s) => s.employees.filter((item) => item.role === 'waiter').length >= 2, unlockDishId: 'fish' },
  { level: 9, title: 'Больше гостей', description: 'Увеличьте лимит гостей до 8', test: (s) => s.guestLimit >= 8 },
  { level: 10, title: 'Большой ресторан', description: 'Оплатите расширение +2×2', test: (s) => s.paidExpansions >= 1, unlockDishId: 'signature' },
];
