import type { IconName } from '../ui/icons';

export interface LoyaltyItem { id: string; name: string; bonus: number; price: number; level: number; icon: IconName; color: string }
export const LOYALTY_ITEMS: LoyaltyItem[] = [
  { id: 'welcomeMint', name: 'Мятный приём', bonus: 5, price: 200, level: 1, icon: 'guest', color: '#8fc9a5' },
  { id: 'softLight', name: 'Мягкий свет', bonus: 8, price: 400, level: 3, icon: 'rating', color: '#f0ce76' },
  { id: 'plant', name: 'Растение', bonus: 10, price: 700, level: 5, icon: 'plant', color: '#74a66f' },
  { id: 'quietMusic', name: 'Тихая музыка', bonus: 12, price: 1100, level: 8, icon: 'recipe', color: '#a68bc2' },
  { id: 'comfortTextile', name: 'Мягкий текстиль', bonus: 15, price: 1700, level: 11, icon: 'decor', color: '#d28b91' },
  { id: 'aquarium', name: 'Аквариум', bonus: 18, price: 2500, level: 14, icon: 'guest', color: '#68b8c7' },
  { id: 'aroma', name: 'Домашние ароматы', bonus: 20, price: 3600, level: 17, icon: 'kitchen', color: '#d99b69' },
  { id: 'fountain', name: 'Фонтанчик', bonus: 25, price: 5200, level: 20, icon: 'decor', color: '#6fa7d8' },
  { id: 'lounge', name: 'Зона отдыха', bonus: 30, price: 7500, level: 24, icon: 'hall', color: '#a5866d' },
  { id: 'vipService', name: 'VIP-сервис', bonus: 40, price: 11000, level: 28, icon: 'rating', color: '#d4ae4c' },
];
export const loyaltyItemById = (id: string): LoyaltyItem | undefined => LOYALTY_ITEMS.find((item) => item.id === id);
