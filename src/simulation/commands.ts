import { CATALOG } from '../content/coreContent';
import type { CommandResult, FurnitureKind, GameState, Point } from './types';
import { samePoint } from './grid';

export function placeFurniture(state: GameState, kind: FurnitureKind, position: Point): CommandResult {
  const item = CATALOG[kind];
  if (state.coins < item.price) return { ok: false, reason: 'Недостаточно монет' };
  const inside = position.x >= 0 && position.y >= 0 && position.x < state.width && position.y < state.height;
  if (!inside) return { ok: false, reason: 'Вне ресторана' };
  if (state.furniture.some((furniture) => samePoint(furniture.position, position))) return { ok: false, reason: 'Клетка занята' };
  state.coins -= item.price;
  state.furniture.push({ id: `${kind}-${state.tick}-${state.furniture.length}`, kind, position, rotation: 0 });
  return { ok: true };
}
