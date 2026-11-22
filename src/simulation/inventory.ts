import { CATALOG } from '../content/coreContent';
import { furnitureCells, samePoint } from './grid';
import type { CommandResult, FurnitureKind, GameState, Point } from './types';
import { applyDecorationRating, decorationRating } from './rating';
import { MAX_STOVES, nextStoveLevel, nextStovePrice, stoveCount, synchronizeChefStoves } from './kitchen';

export function purchaseFurnitureBatch(state: GameState, kind: FurnitureKind, quantity: number): CommandResult {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { ok: false, reason: 'Недопустимое количество' };
  if (kind === 'door') return { ok: false, reason: 'Дверь нельзя добавить на склад' };
  if (kind === 'stove' && stoveCount(state, true) + quantity > MAX_STOVES) return { ok: false, reason: 'Можно иметь не больше трёх плит' };
  let price = 0;
  for (let index = 0; index < quantity; index += 1) {
    const projected = { ...state, furnitureInventory: { ...state.furnitureInventory, stove: (state.furnitureInventory.stove ?? 0) + index } };
    if (kind === 'stove' && state.level < nextStoveLevel(projected)) {
      return { ok: false, reason: `Нужен ${nextStoveLevel(projected)} уровень` };
    }
    price += kind === 'stove' ? nextStovePrice(projected) : CATALOG[kind].price;
  }
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
  if (kind === 'stove' && stoveCount(state) >= MAX_STOVES) return { ok: false, reason: 'Можно разместить не больше трёх плит' };
  const cells = furnitureCells({ id: 'preview', kind, position, rotation });
  if (cells.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= state.width || cell.y >= state.height)) {
    return { ok: false, reason: 'Вне ресторана' };
  }
  if (cells.some((cell) => state.furniture.some((item) => furnitureCells(item, state).some((occupied) => samePoint(cell, occupied))))) {
    return { ok: false, reason: 'Клетка занята' };
  }
  state.furniture.push({ id: `${kind}-${state.tick}-${state.furniture.length}`, kind, position: { ...position }, rotation });
  state.furnitureInventory[kind] = amount - 1;
  state.popularity = Math.min(1000, state.popularity + CATALOG[kind].rating);
  if (kind === 'plant') applyDecorationRating(state, decorationRating(CATALOG.plant.price));
  if (kind === 'stove') synchronizeChefStoves(state);
  return { ok: true };
}
