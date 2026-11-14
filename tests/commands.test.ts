import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { moveFurniture, placeFurniture, removeFurniture, rotateFurniture } from '../src/simulation/commands';
import { furnitureCells } from '../src/simulation/grid';

 describe('placeFurniture', () => {
  it('charges exactly once and adds a plant', () => {
    const state = createGame();
    expect(placeFurniture(state, 'plant', { x: 3, y: 2 })).toEqual({ ok: true });
    expect(state.coins).toBe(950);
    expect(state.furniture.filter((item) => item.kind === 'plant')).toHaveLength(1);
  });

  it('rejects occupied cells without charging', () => {
    const state = createGame();
    expect(placeFurniture(state, 'plant', { x: 1, y: 1 })).toEqual({ ok: false, reason: 'Клетка занята' });
    expect(state.coins).toBe(1_000);
  });

  it('rejects unaffordable purchases without changing state', () => {
    const state = createGame();
    state.coins = 49;
    expect(placeFurniture(state, 'plant', { x: 3, y: 2 })).toEqual({ ok: false, reason: 'Недостаточно монет' });
    expect(state.furniture).toHaveLength(createGame().furniture.length);
  });
});

describe('редактирование мебели', () => {
  it('перемещает на свободную клетку и запрещает занятую', () => {
    const state = createGame();
    expect(moveFurniture(state, 'chair-1', { x: 4, y: 6 }).ok).toBe(true);
    expect(state.furniture.find((item) => item.id === 'chair-1')?.position).toEqual({ x: 4, y: 6 });
    expect(moveFurniture(state, 'chair-1', { x: 1, y: 1 })).toEqual({ ok: false, reason: 'Клетка занята' });
    expect(state.coins).toBe(1000);
  });

  it('вращает двойной стол и учитывает вертикальные клетки', () => {
    const state = createGame();
    state.furniture.push({ id: 'double', kind: 'tableDouble', position: { x: 3, y: 2 }, rotation: 0 });
    expect(rotateFurniture(state, 'double').ok).toBe(true);
    const table = state.furniture.find((item) => item.id === 'double')!;
    expect(table.rotation).toBe(90);
    expect(furnitureCells(table)).toEqual([{ x: 3, y: 2 }, { x: 3, y: 3 }]);
  });

  it('не поворачивает двойной стол за границу', () => {
    const state = createGame();
    state.furniture.push({ id: 'double', kind: 'tableDouble', position: { x: 7, y: 7 }, rotation: 270 });
    expect(rotateFurniture(state, 'double').ok).toBe(false);
    expect(state.furniture.find((item) => item.id === 'double')?.rotation).toBe(270);
  });

  it('возвращает половину цены с округлением вниз', () => {
    const state = createGame();
    expect(removeFurniture(state, 'chair-1').ok).toBe(true);
    expect(state.coins).toBe(1037);
    expect(state.furniture.some((item) => item.id === 'chair-1')).toBe(false);
  });

  it('защищает мебель активного заказа', () => {
    const state = createGame();
    state.orders.push({ id: 'order', customerId: 'guest', state: 'cooking', progress: 1, dishId: 'soup' });
    state.customers.push({ id: 'guest', position: { x: 5, y: 5 }, state: 'waitingFood', patience: 300, seatId: 'chair-1', orderId: 'order' });
    expect(removeFurniture(state, 'stove-1').ok).toBe(false);
    expect(removeFurniture(state, 'chair-1').ok).toBe(false);
  });

  it('снимает бронь идущего гостя при удалении стула', () => {
    const state = createGame();
    state.customers.push({ id: 'walking', position: { x: 3, y: 5 }, state: 'seekingSeat', patience: 300, seatId: 'chair-1', target: { x: 5, y: 5 } });
    expect(removeFurniture(state, 'chair-1').ok).toBe(true);
    expect(state.customers[0].state).toBe('seekingSeat');
    expect(state.customers[0].seatId).toBeUndefined();
    expect(state.customers[0].target).toBeUndefined();
  });
});
