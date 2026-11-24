import { furnitureCells, samePoint } from './grid';
import { MAX_CHEFS } from './staff';
import type { Employee, Furniture, GameState, Point } from './types';

export const MAX_STOVES = 3;
export const CHEF_RANGE = 2;

export function stoveCount(state: GameState, includeInventory = false): number {
  const placed = state.furniture.filter((item) => item.kind === 'stove').length;
  return placed + (includeInventory ? state.furnitureInventory.stove ?? 0 : 0);
}

export function chefCount(state: GameState): number {
  return state.employees.filter((employee) => employee.role === 'chef').length;
}

/** Число одновременно доступных конфорок на каждой размещённой плите. */
export function stoveBurners(state: GameState): number {
  return Math.min(4, 2 + (stoveCount(state) - 1));
}

export function chefLimit(state: GameState): number {
  return Math.min(MAX_CHEFS, stoveCount(state));
}

export function nextStovePrice(state: GameState): number {
  const owned = stoveCount(state, true);
  return owned >= 2 ? 50_000 : owned >= 1 ? 20_000 : 300;
}

export function nextStoveLevel(state: GameState): number {
  return stoveCount(state, true) >= 2 ? 25 : 15;
}

export function stoveForChef(state: GameState, chef: Employee): Furniture | undefined {
  return chef.role === 'chef' && chef.stoveId
    ? state.furniture.find((item) => item.kind === 'stove' && item.id === chef.stoveId)
    : undefined;
}

/** Сохраняет существующие уникальные связи и закрепляет свободные плиты за поварами по порядку. */
export function synchronizeChefStoves(state: GameState): void {
  const stoves = state.furniture.filter((item) => item.kind === 'stove');
  const claimed = new Set<string>();
  const chefs = state.employees.filter((employee) => employee.role === 'chef');
  for (const chef of chefs) {
    if (chef.stoveId && stoves.some((stove) => stove.id === chef.stoveId) && !claimed.has(chef.stoveId)) {
      claimed.add(chef.stoveId);
    } else chef.stoveId = undefined;
  }
  for (const chef of chefs) {
    if (chef.stoveId) continue;
    const stove = stoves.find((item) => !claimed.has(item.id));
    if (!stove) break;
    chef.stoveId = stove.id;
    claimed.add(stove.id);
  }
}

/** Интервал переноса одного готового блюда на стойку, в тиках симуляции. */
export function counterDeliveryInterval(state: GameState): number {
  const stoves = Math.max(1, Math.min(MAX_STOVES, stoveCount(state)));
  return stoves === 3 ? 0.5 : stoves === 2 ? 0.7 : 1;
}

export const kitchenDistance = (a: Point, b: Point): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function distanceToStove(state: GameState, point: Point, stove: Furniture): number {
  return Math.min(...furnitureCells(stove, state).map((cell) => kitchenDistance(cell, point)));
}

/** Лицевая свободная клетка плиты; при её занятии — первая свободная по периметру. */
export function stoveStation(stove: Furniture, state: GameState): Point | null {
  const directions: Record<Furniture['rotation'], Point> = {
    0: { x: 0, y: 1 }, 90: { x: -1, y: 0 }, 180: { x: 0, y: -1 }, 270: { x: 1, y: 0 },
  };
  const cells = furnitureCells(stove, state);
  const occupied = (point: Point) =>
    point.x < 0 || point.y < 0 || point.x >= state.width || point.y >= state.height ||
    state.furniture.some((item) => furnitureCells(item, state).some((cell) => samePoint(cell, point))) ||
    [...state.employees, ...state.customers].some((actor) => samePoint(actor.position, point));
  const direction = directions[stove.rotation];
  const front = cells.map((cell) => ({ x: cell.x + direction.x, y: cell.y + direction.y }));
  const preferred = front.find((point) => !occupied(point));
  if (preferred) return preferred;
  const adjacent = new Map<string, Point>();
  for (const cell of cells) for (const offset of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
    const point = { x: cell.x + offset.x, y: cell.y + offset.y };
    if (!cells.some((stoveCell) => samePoint(stoveCell, point))) adjacent.set(`${point.x},${point.y}`, point);
  }
  return [...adjacent.values()].find((point) => !occupied(point)) ?? null;
}

export function withinChefRange(state: GameState, point: Point, stove?: Furniture): boolean {
  const stoves = stove ? [stove] : state.furniture.filter((item) => item.kind === 'stove');
  return stoves.some((item) => distanceToStove(state, point, item) <= CHEF_RANGE);
}

export function nearestCounterForStove(state: GameState, stove: Furniture): Furniture | undefined {
  return state.furniture
    .filter((item) => item.kind === 'counter')
    .sort((a, b) => distanceToStove(state, a.position, stove) - distanceToStove(state, b.position, stove))[0];
}
