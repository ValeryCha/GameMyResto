import { describe, expect, it } from 'vitest';
import { moveFurniture, placeFurniture } from '../src/simulation/commands';
import { createGame } from '../src/simulation/createGame';
import { stoveStation } from '../src/simulation/kitchen';
import { advanceSimulation } from '../src/simulation/tick';

function surround(state: ReturnType<typeof createGame>, x: number, y: number): void {
  state.furniture.push(
    { id: 'block-n', kind: 'plant', position: { x, y: y - 1 }, rotation: 0 },
    { id: 'block-e', kind: 'plant', position: { x: x + 1, y }, rotation: 0 },
    { id: 'block-s', kind: 'plant', position: { x, y: y + 1 }, rotation: 0 },
    { id: 'block-w', kind: 'plant', position: { x: x - 1, y }, rotation: 0 },
  );
}

describe('LOGIC-8.4.1 — станция повара', () => {
  it('rotation 0 выбирает клетку южнее плиты', () => {
    const state = createGame();
    const stove = state.furniture.find((item) => item.id === 'stove-1')!;
    stove.rotation = 0;
    expect(stoveStation(stove, state)).toEqual({ x: 1, y: 2 });
  });

  it('rotation 90 / 180 / 270 выбирает запад / север / восток', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => item.kind === 'stove' || item.kind === 'door');
    const stove = state.furniture.find((item) => item.kind === 'stove')!;
    stove.position = { x: 4, y: 4 };
    stove.rotation = 90;
    expect(stoveStation(stove, state)).toEqual({ x: 3, y: 4 });
    stove.rotation = 180;
    expect(stoveStation(stove, state)).toEqual({ x: 4, y: 3 });
    stove.rotation = 270;
    expect(stoveStation(stove, state)).toEqual({ x: 5, y: 4 });
  });

  it('не размещает плиту без единой свободной соседней клетки', () => {
    const state = createGame();
    state.level = 15;
    state.coins = 20_000;
    surround(state, 3, 3);
    const furnitureCount = state.furniture.length;
    expect(placeFurniture(state, 'stove', { x: 3, y: 3 })).toEqual({ ok: false, reason: 'Нет места для повара' });
    expect(state.furniture).toHaveLength(furnitureCount);
    expect(state.coins).toBe(20_000);
  });

  it('откатывает перемещение плиты, если на новом месте нет станции', () => {
    const state = createGame();
    state.editorMode = true;
    surround(state, 3, 3);
    const stove = state.furniture.find((item) => item.id === 'stove-1')!;
    const previous = { ...stove.position };
    expect(moveFurniture(state, stove.id, { x: 3, y: 3 })).toEqual({ ok: false, reason: 'Нет места для повара' });
    expect(stove.position).toEqual(previous);
  });

  it('после доставки возвращает повара на сохранённую станцию', () => {
    const state = createGame();
    state.tick = 1;
    state.arrivalProgress = -10_000;
    const stove = state.furniture.find((item) => item.id === 'stove-1')!;
    stove.chefStation = { x: 1, y: 2 };
    state.employees[0].position = { x: 1, y: 2 };
    state.employees[0].activeOrders = ['ready'];
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
    state.orders.push({ id: 'ready', customerId: 'guest-ready', state: 'cooking', progress: 6, dishId: 'soup', stoveId: stove.id, chefId: 'chef-1' });
    advanceSimulation(state);
    expect(state.orders[0].state).toBe('waitingDelivery');
    expect(state.employees[0].position).toEqual(stove.chefStation);
  });

  it('industrialStove выбирает первую свободную из двух лицевых клеток', () => {
    const state = createGame();
    const stove = state.furniture.find((item) => item.id === 'stove-1')!;
    stove.position = { x: 3, y: 3 };
    stove.rotation = 0;
    state.appliedStoveSkins.push({ furnitureId: stove.id, skinId: 'industrialStove' });
    state.furniture.push({ id: 'face-block', kind: 'plant', position: { x: 3, y: 4 }, rotation: 0 });
    expect(stoveStation(stove, state)).toEqual({ x: 4, y: 4 });
  });
});
