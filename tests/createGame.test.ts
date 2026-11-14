import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';

describe('createGame', () => {
  it('starts with enough coins, two workers and a valid entrance', () => {
    const state = createGame();
    expect(state.coins).toBe(1_000);
    expect(state.employees.map((employee) => employee.role)).toEqual(['chef', 'waiter']);
    expect(state.furniture.some((item) => item.kind === 'door')).toBe(true);
    expect(state.customers).toEqual([]);
  });
});
