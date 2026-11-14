import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { expandRestaurant } from '../src/simulation/shop';
import { processProgression } from '../src/simulation/progression';

function doorAt(x: number, y: number) {
  const state = createGame();
  state.coins = 50000;
  state.furniture.find((item) => item.kind === 'door')!.position = { x, y };
  return state;
}

describe('дверь при расширении', () => {
  it.each([
    [{ x: 7, y: 3 }, { x: 9, y: 3 }],
    [{ x: 3, y: 7 }, { x: 3, y: 9 }],
    [{ x: 7, y: 7 }, { x: 9, y: 9 }],
    [{ x: 0, y: 7 }, { x: 0, y: 9 }],
    [{ x: 7, y: 0 }, { x: 9, y: 0 }],
    [{ x: 0, y: 3 }, { x: 0, y: 3 }],
    [{ x: 3, y: 0 }, { x: 3, y: 0 }],
  ])('переносит дверь $position с растущей границей', (position, expected) => {
    const state = doorAt(position.x, position.y);
    expandRestaurant(state);
    expect(state.furniture.find((item) => item.kind === 'door')!.position).toEqual(expected);
    state.coins = 50000;
    expandRestaurant(state);
    expect(state.furniture.find((item) => item.kind === 'door')!.position).toEqual({
      x: expected.x + (expected.x === 9 ? 2 : 0),
      y: expected.y + (expected.y === 9 ? 2 : 0),
    });
  });

  it('переносит дверь при бесплатном расширении за уровень', () => {
    const state = doorAt(7, 3);
    state.experience = 100;
    processProgression(state);
    expect(state.furniture.find((item) => item.kind === 'door')!.position).toEqual({ x: 9, y: 3 });
  });
});
