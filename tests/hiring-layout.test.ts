import { expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { isWalkable } from '../src/simulation/grid';
import { hireWaiter } from '../src/simulation/shop';

it('размещает пять новых официантов на разных свободных клетках', () => {
  const state = createGame();
  state.coins += 10_000;
  for (let count = 0; count < 5; count += 1) expect(hireWaiter(state).ok).toBe(true);

  const waiters = state.employees.filter((employee) => employee.role === 'waiter');
  const positions = waiters.map((waiter) => `${waiter.position.x},${waiter.position.y}`);
  expect(new Set(positions).size).toBe(5);
  for (const waiter of waiters) {
    expect(isWalkable(state, waiter.position)).toBe(true);
    expect(state.employees.some((other) => other.id !== waiter.id && other.position.x === waiter.position.x && other.position.y === waiter.position.y)).toBe(false);
  }
});
