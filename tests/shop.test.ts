import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { addTestFunds, buyCookingUpgrade, buyWaiterUpgrade, claimDailyReward, expandRestaurant, hireWaiter, increaseGuestLimit } from '../src/simulation/shop';
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
    expect(hireWaiter(state).ok).toBe(true);
    state.coins = 60000;
    expect(increaseGuestLimit(state).ok).toBe(true);
    expect(expandRestaurant(state).ok).toBe(true);
    expect([state.width, state.height]).toEqual([10, 10]);
    expect(state.popularity).toBe(38);
  });

  it('переносит дверь только на свободную границу за 100', () => {
    const state = createGame();
    expect(moveDoor(state, { x: 4, y: 4 }).ok).toBe(false);
    expect(moveDoor(state, { x: 7, y: 4 }).ok).toBe(true);
    expect(state.coins).toBe(900);
  });

  it('не тратит деньги при недостатке средств', () => {
    const state = createGame();
    state.coins = 199;
    expect(hireWaiter(state)).toEqual({ ok: false, reason: 'Недостаточно монет' });
    expect(state.employees).toHaveLength(1);
  });

  it('применяет уровневые ограничения, цены и максимум улучшений', () => {
    const state = createGame();
    state.coins = 10000;
    expect(buyCookingUpgrade(state).ok).toBe(false);
    expect(buyWaiterUpgrade(state).ok).toBe(false);
    state.level = 3;
    for (let level = 0; level < 5; level += 1) expect(buyCookingUpgrade(state).ok).toBe(true);
    expect(buyCookingUpgrade(state).ok).toBe(false);
    expect(state.upgrades.cooking).toBe(5);
    for (let level = 0; level < 5; level += 1) expect(buyWaiterUpgrade(state).ok).toBe(true);
    expect(buyWaiterUpgrade(state).ok).toBe(false);
    expect(state.coins).toBe(2315);
  });

  it('выдаёт ежедневную награду один раз за дату', () => {
    const state = createGame();
    expect(claimDailyReward(state, '2026-11-15').ok).toBe(true);
    expect(state.coins).toBe(1100);
    expect(claimDailyReward(state, '2026-11-15').ok).toBe(false);
    expect(state.coins).toBe(1100);
    state.level = 3;
    expect(claimDailyReward(state, '2026-11-16').ok).toBe(true);
    expect(state.coins).toBe(1250);
  });
});
