import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { buyCookingUpgrade, buyWaiterUpgrade, hireWaiter } from '../src/simulation/shop';
import { cookingProgress, upgradePrice, waiterHirePrice, waiterMovementSteps } from '../src/simulation/staff';
import type { Employee } from '../src/simulation/types';

describe('экономика и эффекты персонала', () => {
  it('использует пять прогрессивных цен найма', () => {
    expect([0, 1, 2, 3, 4].map(waiterHirePrice)).toEqual([200, 240, 290, 345, 415]);
  });

  it('не нанимает шестого официанта и не списывает монеты', () => {
    const state = createGame();
    state.coins = 10000;
    for (let index = 0; index < 5; index += 1) expect(hireWaiter(state).ok).toBe(true);
    const coins = state.coins;
    expect(hireWaiter(state)).toEqual({ ok: false, reason: 'Все официанты наняты' });
    expect(state.coins).toBe(coins);
    expect(state.employees.filter((employee) => employee.role === 'waiter')).toHaveLength(5);
  });

  it('содержит пять дорогих улучшений официанта и повара', () => {
    expect([0, 1, 2, 3, 4].map((level) => upgradePrice('waiter', level))).toEqual([500, 675, 910, 1230, 1660]);
    expect([0, 1, 2, 3, 4].map((level) => upgradePrice('cooking', level))).toEqual([300, 390, 505, 660, 855]);
    const state = createGame();
    state.level = 33;
    state.coins = 100000;
    for (let index = 0; index < 5; index += 1) {
      expect(buyWaiterUpgrade(state).ok).toBe(true);
      expect(buyCookingUpgrade(state).ok).toBe(true);
    }
    expect(state.upgrades).toEqual({ cooking: 5, waiter: 5 });
    expect(buyWaiterUpgrade(state).ok).toBe(false);
    expect(buyCookingUpgrade(state).ok).toBe(false);
  });

  it('ускоряет готовку и накапливает дробные шаги официанта', () => {
    expect(cookingProgress(0)).toBe(1);
    expect(cookingProgress(5)).toBeCloseTo(1 / 0.6);
    const employee: Employee = { id: 'w', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 };
    const steps = Array.from({ length: 10 }, () => waiterMovementSteps(employee, 5));
    expect(steps.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(20);
    expect(steps.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(31);
  });
});
