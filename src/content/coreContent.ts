import type { FurnitureKind } from '../simulation/types';
export const CATALOG: Record<FurnitureKind, { price: number; name: string }> = {
  door: { price: 0, name: 'Дверь' },
  stove: { price: 300, name: 'Плита' },
  table: { price: 120, name: 'Стол' },
  chair: { price: 60, name: 'Стул' },
  plant: { price: 50, name: 'Растение' },
};
