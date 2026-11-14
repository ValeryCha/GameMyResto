import type { Point } from '../simulation/types';
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export function gridToScreen(point: Point): Point {
  return { x: (point.x - point.y) * TILE_WIDTH / 2 + 400, y: (point.x + point.y) * TILE_HEIGHT / 2 + 80 };
}
export function screenToGrid(point: Point): Point {
  const x = point.x - 400;
  const y = point.y - 80;
  return { x: Math.round(y / TILE_HEIGHT + x / TILE_WIDTH), y: Math.round(y / TILE_HEIGHT - x / TILE_WIDTH) };
}
