import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';

describe('advanceSimulation', () => {
  it('spawns a customer and eventually earns coins', () => {
    const state = createGame();
    advanceSimulation(state, 240);
    expect(state.customers.length).toBeGreaterThan(0);
    expect(state.coins).toBeGreaterThan(1_000);
    expect(state.experience).toBeGreaterThan(0);
  });

  it('never lets energy or popularity leave their bounds', () => {
    const state = createGame();
    advanceSimulation(state, 1_000);
    for (const employee of state.employees) expect(employee.energy).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeLessThanOrEqual(50);
  });
});
