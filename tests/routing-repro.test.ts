import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { moveToward } from '../src/simulation/movement';
import { advanceSimulation } from '../src/simulation/tick';
import type { Customer } from '../src/simulation/types';

const guest = (id: string, x: number, y: number, state: Customer['state'] = 'seekingSeat'): Customer => ({
  id, position: { x, y }, state, patience: 300,
});

describe('маршруты с учётом персонажей', () => {
  it('проходит через гостя по кратчайшему маршруту к свободному стулу', () => {
    const state = createGame();
    state.furniture.push(
      { id: 'table-2', kind: 'table', position: { x: 6, y: 4 }, rotation: 0 },
      { id: 'chair-2', kind: 'chair', position: { x: 6, y: 5 }, rotation: 0 },
    );
    const arriving = guest('arriving', 4, 5);
    state.customers.push(arriving, guest('blocker', 5, 5, 'leaving'));
    expect(moveToward(state, arriving, { x: 6, y: 5 })).toBe('moving');
    expect(arriving.position).toEqual({ x: 5, y: 5 });
  });

  it('сохраняет бронь и доходит до стула через группу гостей', () => {
    const state = createGame();
    state.tick = 2;
    state.furniture.push(
      { id: 'table-2', kind: 'table', position: { x: 6, y: 4 }, rotation: 0 },
      { id: 'chair-2', kind: 'chair', position: { x: 6, y: 5 }, rotation: 0 },
    );
    const arriving = guest('arriving', 4, 5);
    arriving.seatId = 'chair-2';
    arriving.target = { x: 6, y: 5 };
    state.customers.push(
      arriving,
      guest('blocker-a', 5, 5, 'leaving'),
      guest('blocker-b', 4, 6, 'leaving'),
      guest('blocker-c', 3, 5, 'leaving'),
      guest('blocker-d', 4, 4, 'leaving'),
    );
    advanceSimulation(state, 1);
    expect(arriving.seatId).toBe('chair-2');
    expect(arriving.position).toEqual({ x: 6, y: 5 });
    expect(arriving.state).toBe('seated');
    expect(arriving.target).toBeUndefined();
  });
});
