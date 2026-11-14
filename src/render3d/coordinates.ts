import type { Point } from '../simulation/types';

export interface Vector3Like { x: number; y: number; z: number }

export const gridToWorld = (point: Point): Vector3Like => ({
  x: point.x - 3.5,
  y: 0,
  z: point.y - 3.5,
});

export const worldToGrid = (point: Vector3Like): Point => ({
  x: Math.floor(point.x + 4),
  y: Math.floor(point.z + 4),
});
