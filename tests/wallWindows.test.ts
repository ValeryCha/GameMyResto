import { describe, expect, it } from 'vitest';
import { WINDOWS } from '../src/content/windows';
import { normalizeState } from '../src/persistence/normalizeState';
import { buyPainting, placePainting } from '../src/simulation/catalogDecorations';
import { createGame } from '../src/simulation/createGame';
import { buyWindow, moveWindow, placeWindow, removeWindow } from '../src/simulation/wallWindows';

function game() { const state = createGame(); state.level = 30; state.coins = 100_000; return state; }
describe('окна', () => {
  it('содержит пять уровней с заданными ценами', () => {
    expect(WINDOWS.map(({ price, level }) => ({ price, level }))).toEqual([
      { price: 300, level: 1 }, { price: 800, level: 5 }, { price: 1800, level: 10 },
      { price: 3500, level: 18 }, { price: 7000, level: 25 },
    ]);
  });
  it('занимает горизонтальные и вертикальные клетки согласно размеру', () => {
    expect(WINDOWS.map((item) => [item.widthCells, item.heightCells])).toEqual([[1, 1], [2, 1], [1, 2], [2, 2], [2, 2]]);
    const state = game();
    buyWindow(state, 'panoramaWindow'); buyWindow(state, 'stainedWindow'); buyWindow(state, 'archWindow');
    expect(placeWindow(state, 'panoramaWindow', 'north', 0).ok).toBe(true);
    expect(placeWindow(state, 'stainedWindow', 'north', 1).ok).toBe(false);
    expect(placeWindow(state, 'stainedWindow', 'south', 3).ok).toBe(false);
    expect(placeWindow(state, 'stainedWindow', 'west', 3).ok).toBe(true);
    expect(placeWindow(state, 'archWindow', 'north', 6).ok).toBe(true);
    expect(placeWindow(state, 'archWindow', 'north', 7).ok).toBe(false);
  });
  it('списывает цену за каждый экземпляр и запрещает наложения', () => {
    const state = game();
    expect(buyWindow(state, 'woodWindow').ok).toBe(true);
    expect(buyWindow(state, 'woodWindow').ok).toBe(true);
    expect(state.coins).toBe(99_400);
    expect(placeWindow(state, 'woodWindow', 'north', 0).ok).toBe(true);
    expect(placeWindow(state, 'woodWindow', 'north', 0).ok).toBe(false);
    expect(placeWindow(state, 'woodWindow', 'north', 8).ok).toBe(false);
    buyPainting(state, 'hills');
    expect(placePainting(state, 'hills', 'north', 0).ok).toBe(false);
    const door = state.furniture.find((item) => item.kind === 'door')!;
    expect(placeWindow(state, 'woodWindow', 'north', door.position.x).ok).toBe(false);
  });
  it('ставит окна и картины на появившиеся после расширения стены и сохраняет их', () => {
    const state = game();
    state.width = 12; state.height = 12;
    buyWindow(state, 'woodWindow'); buyPainting(state, 'hills');
    expect(placeWindow(state, 'woodWindow', 'north', 8).ok).toBe(true);
    expect(placePainting(state, 'hills', 'west', 8).ok).toBe(true);
    expect(placeWindow(state, 'woodWindow', 'north', 12).ok).toBe(false);
    normalizeState(state);
    expect(state.appliedWindows).toHaveLength(1);
    expect(state.appliedWindows[0]).toMatchObject({ side: 'north', index: 8 });
    expect(state.appliedPaintings).toHaveLength(1);
    expect(state.appliedPaintings[0]).toMatchObject({ side: 'west', index: 8 });
  });
  it('бесплатно перемещает окно и возвращает 50% при продаже', () => {
    const state = game(); buyWindow(state, 'panoramaWindow'); placeWindow(state, 'panoramaWindow', 'north', 0);
    const id = state.appliedWindows[0].id; const coins = state.coins; const rating = state.decorationRatingBonus;
    expect(moveWindow(state, id, 'west', 2).ok).toBe(true); expect(state.coins).toBe(coins);
    expect(removeWindow(state, id).ok).toBe(true); expect(state.coins).toBe(coins + 400);
    expect(state.decorationRatingBonus).toBe(rating - 16);
  });
  it('восстанавливает только корректные окна из сохранения и учитывает их рейтинг', () => {
    const state = game();
    state.appliedWindows = [
      { id: 'ok', windowId: 'archWindow', side: 'north', index: 0 },
      { id: 'bad', windowId: 'archWindow', side: 'north', index: 99 },
      { id: 'duplicate', windowId: 'archWindow', side: 'north', index: 0 },
    ];
    normalizeState(state);
    expect(state.appliedWindows).toHaveLength(1); expect(state.ownedWindows).toContain('archWindow');
    expect(state.decorationRatingBonus).toBe(70);
  });
});
