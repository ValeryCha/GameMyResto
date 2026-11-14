import type { GameState, Point } from './types';

export const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const key = (p: Point) => `${p.x},${p.y}`;
const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function isWalkable(state: GameState, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < state.width && point.y < state.height &&
    !state.furniture.some((item) => samePoint(item.position, point));
}

export function findPath(state: GameState, from: Point, to: Point): Point[] {
  if (to.x < 0 || to.y < 0 || to.x >= state.width || to.y >= state.height) return [];
  const open: Point[] = [from];
  const cameFrom = new Map<string, Point>();
  const g = new Map<string, number>([[key(from), 0]]);
  const f = new Map<string, number>([[key(from), heuristic(from, to)]]);
  const directions: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) ?? Infinity) - (f.get(key(b)) ?? Infinity) || key(a).localeCompare(key(b)));
    const current = open.shift()!;
    if (samePoint(current, to)) {
      const path = [current];
      let cursor = current;
      while (cameFrom.has(key(cursor))) {
        cursor = cameFrom.get(key(cursor))!;
        path.unshift(cursor);
      }
      return path.slice(1);
    }
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!isWalkable(state, next) && !samePoint(next, to)) continue;
      const tentative = (g.get(key(current)) ?? Infinity) + 1;
      if (tentative >= (g.get(key(next)) ?? Infinity)) continue;
      cameFrom.set(key(next), current);
      g.set(key(next), tentative);
      f.set(key(next), tentative + heuristic(next, to));
      if (!open.some((point) => samePoint(point, next))) open.push(next);
    }
  }
  return [];
}
