import { findPath, isWalkable, samePoint } from './grid';
import type { GameState, Point } from './types';

export type MoveResult = 'arrived' | 'moving' | 'blocked';

export function moveToward(state: GameState, actor: { id?: string; position: Point }, target: Point, allowFurnitureTarget = false): MoveResult {
  if (samePoint(actor.position, target)) return 'arrived';
  if (!allowFurnitureTarget && !isWalkable(state, target)) return 'blocked';
  // Персонал может расходиться друг с другом, но никогда не проходит сквозь гостей.
  const occupied = ('role' in actor ? state.customers : [...state.employees, ...state.customers])
    .filter((other) => other.id !== actor.id)
    .map((other) => other.position);
  const path = findPath(state, actor.position, target, occupied);
  if (!path.length) return 'blocked';
  actor.position = { ...path[0] };
  return samePoint(actor.position, target) ? 'arrived' : 'moving';
}

export function moveActor(state: GameState, actor: { id?: string; position: Point }, target: Point, steps = 2, allowFurnitureTarget = false): MoveResult {
  let result: MoveResult = 'arrived';
  for (let step = 0; step < steps; step += 1) {
    result = moveToward(state, actor, target, allowFurnitureTarget);
    if (result !== 'moving') break;
  }
  return result;
}
