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

  it('allows paths through free chairs but not tables or the counter', () => {
    const state = createGame();
    state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 4, y: 6 }, rotation: 0 });
    state.furniture.find((item) => item.id === 'chair-1')!.position = { x: 3, y: 3 };
    expect(isWalkable(state, { x: 3, y: 3 })).toBe(true);
    expect(isWalkable(state, { x: 5, y: 4 })).toBe(false);
    expect(isWalkable(state, { x: 4, y: 6 })).toBe(false);
    expect(isWalkable(state, { x: 0, y: 7 })).toBe(false);
    const path = findPath(state, { x: 3, y: 4 }, { x: 3, y: 2 });
    expect(path).toContainEqual({ x: 3, y: 3 });
    expect(path.at(-1)).toEqual({ x: 3, y: 2 });
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
