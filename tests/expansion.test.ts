import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { expandRestaurant } from '../src/simulation/shop';
import { processProgression } from '../src/simulation/progression';
import { normalizeState } from '../src/persistence/normalizeState';
import { expandBounds } from '../src/simulation/expansion';

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
    state.experience = 1799;
    processProgression(state);
    expect(state.furniture.find((item) => item.kind === 'door')!.position).toEqual({ x: 9, y: 3 });
  });
});


describe('наследование обоев при расширении', () => {
  it('бесплатно продолжает узор каждой стены на новых клетках', () => {
    const state = createGame();
    state.coins = 50_000;
    state.appliedWallpapers = [
      { wallCellId: 'north-7', wallpaperId: 'creamStripes' },
      { wallCellId: 'south-7', wallpaperId: 'warmBrick' },
      { wallCellId: 'west-7', wallpaperId: 'kitchenGrid' },
      { wallCellId: 'east-7', wallpaperId: 'goldenHoliday' },
    ];
    state.activeWallpaperId = 'creamStripes';
    const coins = state.coins;

    expandBounds(state);

    expect(state.coins).toBe(coins);
    for (const [side, wallpaperId] of [['north', 'creamStripes'], ['south', 'warmBrick'], ['west', 'kitchenGrid'], ['east', 'goldenHoliday']] as const) {
      expect(state.appliedWallpapers.filter((item) => item.wallCellId === `${side}-8` || item.wallCellId === `${side}-9`)).toEqual([
        { wallCellId: `${side}-8`, wallpaperId }, { wallCellId: `${side}-9`, wallpaperId },
      ]);
    }
  });

  it('однократно достраивает новые стены старого сейва и не отменяет ручное снятие обоев', () => {
    const state = createGame();
    state.width = 12; state.height = 12;
    state.appliedWallpapers = [
      { wallCellId: 'north-0', wallpaperId: 'creamStripes' },
      { wallCellId: 'west-0', wallpaperId: 'warmBrick' },
    ];
    state.activeWallpaperId = 'creamStripes';

    normalizeState(state);
    expect(state.appliedWallpapers.filter((item) => item.wallCellId.startsWith('north-')).slice(-4).map((item) => item.wallCellId)).toEqual(['north-8', 'north-9', 'north-10', 'north-11']);
    expect(state.appliedWallpapers.filter((item) => item.wallCellId.startsWith('west-')).slice(-4).every((item) => item.wallpaperId === 'warmBrick')).toBe(true);

    state.appliedWallpapers = state.appliedWallpapers.filter((item) => item.wallCellId !== 'north-8');
    normalizeState(state);
    expect(state.appliedWallpapers.some((item) => item.wallCellId === 'north-8')).toBe(false);
  });
});
