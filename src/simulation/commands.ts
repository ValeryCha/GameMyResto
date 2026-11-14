import { CATALOG } from '../content/coreContent';
import type { CommandResult, FurnitureKind, GameState, Point } from './types';
import { furnitureCells, samePoint } from './grid';

function inside(state: GameState, point: Point): boolean {
  return point.x >= 0 && point.y >= 0 && point.x < state.width && point.y < state.height;
}

function occupied(state: GameState, point: Point, ignoreId?: string): boolean {
  return state.furniture.some((item) => item.id !== ignoreId && furnitureCells(item).some((cell) => samePoint(cell, point)));
}

export function placeFurniture(state: GameState, kind: FurnitureKind, position: Point): CommandResult {
  const item = CATALOG[kind];
  const cells = kind === 'tableDouble' ? [position, { x: position.x + 1, y: position.y }] : [position];
  if (cells.some((point) => !inside(state, point))) return { ok: false, reason: 'Вне ресторана' };
  if (cells.some((point) => occupied(state, point))) return { ok: false, reason: 'Клетка занята' };
  if (state.coins < item.price) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= item.price;
  state.popularity = Math.min(100, state.popularity + item.rating);
  state.furniture.push({ id: `${kind}-${state.tick}-${state.furniture.length}`, kind, position: { ...position }, rotation: 0 });
  return { ok: true };
}

export function moveDoor(state: GameState, position: Point): CommandResult {
  const border = position.x === 0 || position.y === 0 || position.x === state.width - 1 || position.y === state.height - 1;
  if (!inside(state, position) || !border) return { ok: false, reason: 'Дверь можно поставить только на границе' };
  const door = state.furniture.find((item) => item.kind === 'door');
  if (!door) return { ok: false, reason: 'Дверь не найдена' };
  if (occupied(state, position, door.id)) return { ok: false, reason: 'Клетка занята' };
  if (state.coins < 100) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= 100;
  state.popularity = Math.min(100, state.popularity + 2);
  door.position = { ...position };
  return { ok: true };
}
