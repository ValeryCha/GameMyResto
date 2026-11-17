import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { purchaseFurnitureBatch, placePurchasedFurniture } from '../src/simulation/inventory';
import { normalizeState } from '../src/persistence/normalizeState';

describe('серийная покупка и установка', () => {
  it('покупает три стола и устанавливает без повторной оплаты', () => {
    const state = createGame();
    expect(purchaseFurnitureBatch(state, 'table', 3)).toEqual({ ok: true });
    expect(state.coins).toBe(700);
    for (const x of [1, 2, 3]) expect(placePurchasedFurniture(state, 'table', { x, y: 5 }).ok).toBe(true);
    expect(state.coins).toBe(700); expect(state.furnitureInventory.table).toBe(0);
    expect(placePurchasedFurniture(state, 'table', { x: 6, y: 6 }).ok).toBe(false);
  });
  it('не расходует запас на занятой клетке и проверяет обе клетки двойного стола', () => {
    const state = createGame(); purchaseFurnitureBatch(state, 'tableDouble', 1);
    expect(placePurchasedFurniture(state, 'tableDouble', { x: 4, y: 4 })).toEqual({ ok: false, reason: 'Клетка занята' });
    expect(state.furnitureInventory.tableDouble).toBe(1);
    expect(placePurchasedFurniture(state, 'tableDouble', { x: 7, y: 5 })).toEqual({ ok: false, reason: 'Вне ресторана' });
    expect(state.furnitureInventory.tableDouble).toBe(1);
  });
  it('сохраняет остаток при нормализации и ограничивает количество', () => {
    const state = createGame(); purchaseFurnitureBatch(state, 'chair', 3);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.furnitureInventory.chair).toBe(3);
    restored.furnitureInventory.chair = 1000; normalizeState(restored);
    expect(restored.furnitureInventory.chair).toBe(99);
  });
});
