export interface DoorPattern {
  id: string;
  name: string;
  level: number;
  price: number;
  description: string;
  color: string;
}

export const DOOR_PATTERNS: DoorPattern[] = [
  { id: 'oak', name: 'Дубовая дверь', level: 1, price: 300, description: 'Тёплое дерево и латунная ручка', color: '#80503a' },
  { id: 'glass', name: 'Стеклянная дверь', level: 5, price: 900, description: 'Светлое стекло в тонкой раме', color: '#78b7bd' },
  { id: 'stained', name: 'Витражная дверь', level: 10, price: 2200, description: 'Цветные вставки и свинцовый контур', color: '#496f86' },
  { id: 'metal', name: 'Металлическая дверь', level: 18, price: 4500, description: 'Графит и стальные заклёпки', color: '#465057' },
  { id: 'carved', name: 'Резная дверь', level: 25, price: 8000, description: 'Орех, резьба и золотой орнамент', color: '#563126' },
];

export const doorPatternById = (id: string): DoorPattern | undefined => DOOR_PATTERNS.find((item) => item.id === id);
export const doorPreview = (id: string): string => {
  const door = doorPatternById(id)!;
  if (id === 'glass') return 'linear-gradient(135deg, #ffffff90 0 20%, transparent 21% 55%, #ffffff70 56% 62%, transparent 63%), #78b7bd';
  if (id === 'stained') return 'repeating-conic-gradient(from 45deg, #d8a64d 0 25%, #6d3c64 0 50%, #4c8b83 0 75%, #a54d42 0) 0 0 / 24px 24px';
  if (id === 'metal') return 'radial-gradient(circle, #b6c0c4 0 2px, transparent 3px), linear-gradient(90deg, #394249, #657078, #394249)';
  if (id === 'carved') return 'radial-gradient(ellipse, transparent 0 35%, #c79a46 37% 40%, transparent 42%), repeating-linear-gradient(90deg, #563126 0 18px, #6c4030 19px 21px)';
  return 'repeating-linear-gradient(90deg, #80503a 0 20px, #6b402f 21px 23px)';
};
