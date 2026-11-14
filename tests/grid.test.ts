import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { findPath, isWalkable } from '../src/simulation/grid';

describe('grid', () => {
  it('rejects occupied and out-of-bounds cells', () => {
    const state = createGame();
    expect(isWalkable(state, { x: 1, y: 1 })).toBe(false);
    expect(isWalkable(state, { x: -1, y: 0 })).toBe(false);
    expect(isWalkable(state, { x: 3, y: 2 })).toBe(true);
  });

  it('walks around a stove instead of through it', () => {
    const path = findPath(createGame(), { x: 0, y: 1 }, { x: 2, y: 1 });
    expect(path.at(-1)).toEqual({ x: 2, y: 1 });
    expect(path).not.toContainEqual({ x: 1, y: 1 });
  });

  it('returns an empty path for an enclosed target', () => {
    const state = createGame();
    state.furniture.push(
      { id: 'wall-a', kind: 'plant', position: { x: 2, y: 3 }, rotation: 0 },
      { id: 'wall-b', kind: 'plant', position: { x: 4, y: 3 }, rotation: 0 },
      { id: 'wall-c', kind: 'plant', position: { x: 3, y: 2 }, rotation: 0 },
      { id: 'wall-d', kind: 'plant', position: { x: 3, y: 4 }, rotation: 0 },
    );
    expect(findPath(state, { x: 0, y: 1 }, { x: 3, y: 3 })).toEqual([]);
  });
});
