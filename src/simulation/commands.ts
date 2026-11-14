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

function editableItem(state: GameState, id: string) {
  return state.furniture.find((item) => item.id === id && item.kind !== 'door');
}

function validCells(state: GameState, item: GameState['furniture'][number]): CommandResult {
  const cells = furnitureCells(item);
  if (cells.some((point) => !inside(state, point))) return { ok: false, reason: 'Вне ресторана' };
  if (cells.some((point) => occupied(state, point, item.id))) return { ok: false, reason: 'Клетка занята' };
  return { ok: true };
}

function itemInUse(state: GameState, item: GameState['furniture'][number]): boolean {
  const active = state.orders.some((order) => order.state !== 'delivered');
  if ((item.kind === 'stove' || item.kind === 'counter') && active) return true;
  if (item.kind !== 'table' && item.kind !== 'tableDouble' && item.kind !== 'chair') return false;
  return state.customers.some((guest) => {
    if (guest.state === 'seekingSeat' || guest.state === 'wandering' || guest.state === 'inspecting' || guest.state === 'leaving') return false;
    if (item.kind === 'chair' && guest.seatId === item.id) return true;
    const chair = state.furniture.find((candidate) => candidate.id === guest.seatId);
    return Boolean(chair && furnitureCells(item).some((cell) => Math.abs(cell.x - chair.position.x) + Math.abs(cell.y - chair.position.y) === 1));
  });
}

export function moveFurniture(state: GameState, id: string, position: Point): CommandResult {
  const item = editableItem(state, id);
  if (!item) return { ok: false, reason: 'Объект не найден' };
  if (itemInUse(state, item)) return { ok: false, reason: 'Объект используется гостем или заказом' };
  const previous = item.position;
  item.position = { ...position };
  const result = validCells(state, item);
  if (!result.ok) item.position = previous;
  return result;
}

export function rotateFurniture(state: GameState, id: string): CommandResult {
  const item = editableItem(state, id);
  if (!item) return { ok: false, reason: 'Объект не найден' };
  if (itemInUse(state, item)) return { ok: false, reason: 'Объект используется гостем или заказом' };
  const previous = item.rotation;
  item.rotation = ((previous + 90) % 360) as 0 | 90 | 180 | 270;
  const result = validCells(state, item);
  if (!result.ok) item.rotation = previous;
  return result;
}

export function removeFurniture(state: GameState, id: string): CommandResult {
  const item = editableItem(state, id);
  if (!item) return { ok: false, reason: 'Объект не найден' };
  if (itemInUse(state, item)) return { ok: false, reason: 'Объект используется гостем или заказом' };
  state.furniture = state.furniture.filter((candidate) => candidate.id !== id);
  state.coins += Math.floor(CATALOG[item.kind].price * 0.5);
  for (const guest of state.customers.filter((candidate) => candidate.seatId === id)) {
    guest.seatId = undefined;
    guest.target = undefined;
    guest.state = 'seekingSeat';
  }
  return { ok: true };
}
