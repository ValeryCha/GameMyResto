import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { addTestFunds, expandRestaurant, hireWaiter, increaseGuestLimit } from '../src/simulation/shop';
import { moveDoor, placeFurniture } from '../src/simulation/commands';

 describe('магазин и рейтинг', () => {
  it('временно добавляет 50000 монет без изменения опыта и рейтинга', () => {
    const state = createGame();
    addTestFunds(state);
    expect(state.coins).toBe(51000);
    expect(state.experience).toBe(0);
    expect(state.popularity).toBe(10);
  });

  it('покупает стол 1×1 за 100 и повышает рейтинг', () => {
    const state = createGame();
    expect(placeFurniture(state, 'table', { x: 3, y: 5 }).ok).toBe(true);
    expect(state.coins).toBe(900);
    expect(state.popularity).toBe(11);
  });

  it('проверяет обе клетки двойного стола и не списывает при ошибке', () => {
    const state = createGame();
    expect(placeFurniture(state, 'tableDouble', { x: 6, y: 6 }).ok).toBe(true);
    expect(state.coins).toBe(800);
    expect(placeFurniture(state, 'chair', { x: 7, y: 6 }).ok).toBe(false);
    expect(state.coins).toBe(800);
  });

  it('нанимает официанта, покупает лимит и расширяет ровно на 2×2', () => {
    const state = createGame();
    expect(state.employees.some((employee) => employee.role === 'waiter')).toBe(false);
    expect(hireWaiter(state).ok).toBe(true);
    expect(state.employees.filter((employee) => employee.role === 'waiter')).toHaveLength(1);
    state.coins = 60000;
    expect(increaseGuestLimit(state).ok).toBe(true);
    expect(state.guestLimit).toBe(8);
    expect(expandRestaurant(state).ok).toBe(true);
    expect([state.width, state.height]).toEqual([10, 10]);
    expect(state.popularity).toBe(38);
  });

  it('переносит дверь только на свободную границу за 100', () => {
    const state = createGame();
    expect(moveDoor(state, { x: 4, y: 4 }).ok).toBe(false);
    expect(moveDoor(state, { x: 7, y: 4 }).ok).toBe(true);
    expect(state.furniture.find((item) => item.kind === 'door')?.position).toEqual({ x: 7, y: 4 });
    expect(state.coins).toBe(900);
  });

  it('не тратит деньги при недостатке средств', () => {
    const state = createGame();
    state.coins = 199;
    expect(hireWaiter(state)).toEqual({ ok: false, reason: 'Недостаточно монет' });
    expect(state.employees).toHaveLength(1);
  });
});
