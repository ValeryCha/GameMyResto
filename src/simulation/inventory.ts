import { CATALOG } from '../content/coreContent';
import { furnitureCells, samePoint } from './grid';
import type { CommandResult, FurnitureKind, GameState, Point } from './types';
import { applyDecorationRating, decorationRating } from './rating';

export function purchaseFurnitureBatch(state: GameState, kind: FurnitureKind, quantity: number): CommandResult {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { ok: false, reason: 'Недопустимое количество' };
  if (kind === 'door') return { ok: false, reason: 'Дверь нельзя добавить на склад' };
  const price = CATALOG[kind].price * quantity;
  if (state.coins < price) return { ok: false, reason: 'Недостаточно монет' };
  state.furnitureInventory ??= {};
  const current = state.furnitureInventory[kind] ?? 0;
  if (current + quantity > 99) return { ok: false, reason: 'На складе не больше 99 предметов' };
  state.coins -= price;
  state.furnitureInventory[kind] = current + quantity;
  return { ok: true };
}

export function placePurchasedFurniture(state: GameState, kind: FurnitureKind, position: Point, rotation: 0 | 90 | 180 | 270 = 0): CommandResult {
  const amount = state.furnitureInventory?.[kind] ?? 0;
  if (amount < 1) return { ok: false, reason: 'Сначала купите предмет' };
  const cells = furnitureCells({ id: 'preview', kind, position, rotation });
  if (cells.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= state.width || cell.y >= state.height)) {
    return { ok: false, reason: 'Вне ресторана' };
  }
  if (cells.some((cell) => state.furniture.some((item) => furnitureCells(item).some((occupied) => samePoint(cell, occupied))))) {
    return { ok: false, reason: 'Клетка занята' };
  }
  state.furniture.push({ id: `${kind}-${state.tick}-${state.furniture.length}`, kind, position: { ...position }, rotation });
  state.furnitureInventory[kind] = amount - 1;
  state.popularity = Math.min(1000, state.popularity + CATALOG[kind].rating);
  if (kind === 'plant') applyDecorationRating(state, decorationRating(CATALOG.plant.price));
  return { ok: true };
}
