import { findPath, isWalkable, samePoint } from './grid';
import type { GameState, Point } from './types';

export type MoveResult = 'arrived' | 'moving' | 'blocked';

export function moveToward(state: GameState, actor: { id?: string; position: Point }, target: Point, allowFurnitureTarget = false): MoveResult {
  if (samePoint(actor.position, target)) return 'arrived';
  if (!allowFurnitureTarget && !isWalkable(state, target)) return 'blocked';
  const occupied = [...state.employees, ...state.customers]
    .filter((other) => other.id !== actor.id)
    .map((other) => other.position);
  const path = findPath(state, actor.position, target, occupied);
  if (!path.length) return 'blocked';
  actor.position = { ...path[0] };
  return samePoint(actor.position, target) ? 'arrived' : 'moving';
}

export function moveActor(state: GameState, actor: { id?: string; position: Point }, target: Point): MoveResult {
  const first = moveToward(state, actor, target);
  if (first !== 'moving') return first;
  return moveToward(state, actor, target);
}
