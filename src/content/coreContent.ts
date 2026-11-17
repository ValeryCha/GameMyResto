import type { FurnitureKind } from '../simulation/types';
export const CATALOG: Record<FurnitureKind, { price: number; name: string; rating: number }> = {
  door: { price: 0, name: 'Дверь', rating: 0 },
  stove: { price: 300, name: 'Плита', rating: 0 },
  table: { price: 100, name: 'Стол 1×1', rating: 10 },
  tableDouble: { price: 200, name: 'Стол 2×1', rating: 20 },
  chair: { price: 75, name: 'Стул', rating: 10 },
  plant: { price: 50, name: 'Растение', rating: 10 },
  counter: { price: 300, name: 'Стойка выдачи', rating: 50 },
};
