import { describe, expect, it } from 'vitest';
import { gridToWorld, worldToGrid } from '../src/render3d/coordinates';

describe('3D coordinates', () => {
  it('keeps the grid origin and round-trips cells', () => {
    expect(gridToWorld({ x: 0, y: 0 })).toEqual({ x: -3.5, y: 0, z: -3.5 });
    expect(worldToGrid(gridToWorld({ x: 3, y: 2 }))).toEqual({ x: 3, y: 2 });
  });
});
