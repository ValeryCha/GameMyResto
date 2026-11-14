import { findPath, isWalkable, samePoint } from './grid';
import type { GameState, Point } from './types';

export type MoveResult = 'arrived' | 'moving' | 'blocked';

export function moveToward(state: GameState, actor: { id?: string; position: Point }, target: Point): MoveResult {
  if (samePoint(actor.position, target)) return 'arrived';
  if (!isWalkable(state, target)) return 'blocked';
  const path = findPath(state, actor.position, target);
  if (!path.length) return 'blocked';
  const occupied = [...state.employees, ...state.customers].some((other) => other.id !== actor.id && samePoint(other.position, path[0]));
  if (occupied) return 'blocked';
  actor.position = { ...path[0] };
  return samePoint(actor.position, target) ? 'arrived' : 'moving';
}
