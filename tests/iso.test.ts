import { describe, expect, it } from 'vitest';
import { gridToScreen, screenToGrid } from '../src/render/iso';

describe('isometric projection', () => {
  it('round-trips grid coordinates', () => {
    for (const point of [{ x: 0, y: 0 }, { x: 3, y: 6 }, { x: 7, y: 2 }]) {
      expect(screenToGrid(gridToScreen(point))).toEqual(point);
    }
  });
});
