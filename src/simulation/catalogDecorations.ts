import { furnitureSkinById } from '../content/furnitureSkins';
import { loyaltyItemById } from '../content/loyalty';
import { paintingById, type Painting } from '../content/paintings';
import { windowWallCells } from './wallWindows';
import { windowById } from '../content/windows';
import { applyDecorationRating, decorationRating } from './rating';
import { furnitureCells } from './grid';
import type { ActorSkinAssignment, AppliedPainting, CommandResult, FurnitureSkinAssignment, GameState } from './types';

function furnitureAssignments(state: GameState, kind: string): FurnitureSkinAssignment[] {
  if (kind === 'stove') return state.appliedStoveSkins;
  if (kind === 'counter') return state.appliedCounterSkins;
  return state.appliedFurnitureSkins;
}
function actorAssignments(state: GameState, kind: string): ActorSkinAssignment[] {
  return kind === 'chef' ? state.appliedChefSkins : state.appliedWaiterSkins;
}
function targetIds(state: GameState, kind: string): string[] {
  if (kind === 'chef' || kind === 'waiter') return state.employees.filter((employee) => employee.role === kind).map((employee) => employee.id);
  return state.furniture.filter((item) => item.kind === kind).map((item) => item.id);
}
export function assignedSkinId(state: GameState, targetId: string): string | undefined {
  return [...state.appliedFurnitureSkins, ...state.appliedStoveSkins, ...state.appliedCounterSkins,
    ...state.appliedChefSkins.map((item) => ({ furnitureId: item.employeeId, skinId: item.skinId })),
    ...state.appliedWaiterSkins.map((item) => ({ furnitureId: item.employeeId, skinId: item.skinId }))]
    .find((assignment) => assignment.furnitureId === targetId)?.skinId;
}
export function buyFurnitureSkin(state: GameState, skinId: string): CommandResult {
  const skin = furnitureSkinById(skinId);
  if (!skin) return { ok: false, reason: 'Скин не найден' };
  if (state.level < skin.level) return { ok: false, reason: `Нужен ${skin.level} уровень` };
  if (state.coins < skin.price) return { ok: false, reason: 'Недостаточно монет' };
  if (targetIds(state, skin.kind).length === 0) return { ok: false, reason: 'Нет подходящих объектов для этого скина' };
  state.coins -= skin.price;
  if (!state.ownedFurnitureSkins.includes(skinId)) state.ownedFurnitureSkins.push(skinId);
  return { ok: true };
}
export function applyFurnitureSkin(state: GameState, skinId: string, targetId?: string): CommandResult {
  const skin = furnitureSkinById(skinId);
  if (!skin || !state.ownedFurnitureSkins.includes(skinId)) return { ok: false, reason: 'Сначала купите скин' };
  const ids = targetId === undefined ? targetIds(state, skin.kind) : [targetId];
  if (!ids.length) return { ok: false, reason: 'Нет подходящих объектов' };
  const validIds = ids.filter((id) => targetIds(state, skin.kind).includes(id));
  if (validIds.length !== ids.length) return { ok: false, reason: 'Этот скин не подходит объекту' };
  if (skin.id === 'industrialStove') {
    const appliedStoveSkins = [...state.appliedStoveSkins.filter((assignment) => !validIds.includes(assignment.furnitureId)),
      ...validIds.map((furnitureId) => ({ furnitureId, skinId }))];
    const geometryState = { ...state, appliedStoveSkins };
    for (const id of validIds) {
      const stove = state.furniture.find((item) => item.id === id)!;
      const cells = furnitureCells(stove, geometryState);
      const blocked = cells.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= state.width || cell.y >= state.height ||
        state.furniture.some((other) => other.id !== id && furnitureCells(other, geometryState).some((occupied) => occupied.x === cell.x && occupied.y === cell.y)) ||
        [...state.employees, ...state.customers].some((actor) => actor.position.x === cell.x && actor.position.y === cell.y));
      if (blocked) return { ok: false, reason: 'Для плиты 1×2 нужны две свободные клетки' };
    }
  }
  const actor = skin.kind === 'chef' || skin.kind === 'waiter';
  const list: (ActorSkinAssignment | FurnitureSkinAssignment)[] = actor ? actorAssignments(state, skin.kind) : furnitureAssignments(state, skin.kind);
  let ratingDelta = 0;
  for (const id of validIds) {
    const index = list.findIndex((assignment) => ('employeeId' in assignment ? assignment.employeeId : assignment.furnitureId) === id);
    const previous = index >= 0 ? furnitureSkinById(list[index].skinId) : undefined;
    if (previous?.id === skinId) continue;
    if (previous) ratingDelta -= decorationRating(previous.price);
    ratingDelta += decorationRating(skin.price);
    const assignment = actor ? { employeeId: id, skinId } : { furnitureId: id, skinId };
    if (index >= 0) list[index] = assignment; else list.push(assignment);
  }
  applyDecorationRating(state, ratingDelta);
  return { ok: true };
}
/** Старый командный API теперь применяет скин только к существующим объектам. */
export function buyOrApplyFurnitureSkin(state: GameState, skinId: string): CommandResult {
  const purchase = buyFurnitureSkin(state, skinId);
  return purchase.ok ? applyFurnitureSkin(state, skinId) : purchase;
}

export function buyPainting(state: GameState, paintingId: string): CommandResult {
  const painting = paintingById(paintingId);
  if (!painting) return { ok: false, reason: 'Картина не найдена' };
  if (state.level < painting.level) return { ok: false, reason: `Нужен ${painting.level} уровень` };
  if (state.coins < painting.price) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= painting.price;
  state.ownedPaintings.push(paintingId);
  return { ok: true };
}
export function paintingWallCells(painting: Painting, placement: Pick<AppliedPainting, 'side' | 'index'>, width: number, height: number): string[] {
  const length = placement.side === 'north' || placement.side === 'south' ? width : height;
  if (!Number.isInteger(placement.index) || placement.index < 0 || placement.index + painting.widthCells > length) return [];
  return Array.from({ length: painting.widthCells }, (_, offset) => `${placement.side}-${placement.index + offset}`);
}
function paintingPlacementError(state: GameState, painting: Painting, side: AppliedPainting['side'], index: number, ignoreId?: string): string | undefined {
  const cells = paintingWallCells(painting, { side, index }, state.width, state.height);
  if (!cells.length) return 'Картина не помещается на этой стене';
  if (painting.heightCells > 1 && (side === 'south' || side === 'east')) return 'Высокая картина помещается только на высокой стене';
  if (state.appliedPaintings.some((placed) => placed.id !== ignoreId && paintingWallCells(paintingById(placed.paintingId)!, placed, state.width, state.height).some((cell) => cells.includes(cell)))) return 'Этот участок стены занят картиной';
  if ((state.appliedWindows ?? []).some((placed) => windowWallCells(windowById(placed.windowId)!, placed.side, placed.index, state.width, state.height).some((cell) => cells.includes(cell)))) return 'Этот участок стены занят окном';
  const door = state.furniture.find((item) => item.kind === 'door');
  const doorCell = door ? door.position.y === 0 ? `north-${door.position.x}` : door.position.y === state.height - 1 ? `south-${door.position.x}` : door.position.x === 0 ? `west-${door.position.y}` : `east-${door.position.y}` : '';
  if (cells.includes(doorCell)) return 'Нельзя закрывать дверь картиной';
  return undefined;
}
export function placePainting(state: GameState, paintingId: string, side: AppliedPainting['side'], index: number): CommandResult {
  const painting = paintingById(paintingId);
  if (!painting || !state.ownedPaintings.includes(paintingId)) return { ok: false, reason: 'Сначала купите картину' };
  const error = paintingPlacementError(state, painting, side, index);
  if (error) return { ok: false, reason: error };
  let sequence = state.appliedPaintings.length;
  let id = `painting-${state.tick}-${sequence}`;
  while (state.appliedPaintings.some((placed) => placed.id === id)) { sequence += 1; id = `painting-${state.tick}-${sequence}`; }
  state.appliedPaintings.push({ id, paintingId, side, index });
  applyDecorationRating(state, decorationRating(painting.price));
  return { ok: true };
}
export function movePainting(state: GameState, id: string, side: AppliedPainting['side'], index: number): CommandResult {
  const placed = state.appliedPaintings.find((item) => item.id === id);
  const painting = placed ? paintingById(placed.paintingId) : undefined;
  if (!placed || !painting) return { ok: false, reason: 'Картина не найдена' };
  const error = paintingPlacementError(state, painting, side, index, id);
  if (error) return { ok: false, reason: error };
  placed.side = side; placed.index = index;
  return { ok: true };
}
export function removePainting(state: GameState, id: string): CommandResult {
  const placed = state.appliedPaintings.find((item) => item.id === id);
  if (!placed) return { ok: false, reason: 'Картина не найдена' };
  const painting = paintingById(placed.paintingId)!;
  state.appliedPaintings = state.appliedPaintings.filter((item) => item.id !== id);
  state.coins += Math.floor(painting.price / 2);
  applyDecorationRating(state, -decorationRating(painting.price));
  return { ok: true };
}
export function buyLoyaltyItem(state: GameState, itemId: string): CommandResult {
  const item = loyaltyItemById(itemId);
  if (!item) return { ok: false, reason: 'Предмет не найден' };
  if (state.level < item.level) return { ok: false, reason: `Нужен ${item.level} уровень` };
  if (state.ownedLoyaltyItems.includes(itemId)) return { ok: false, reason: 'Уже куплено' };
  if (state.coins < item.price) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= item.price;
  state.ownedLoyaltyItems.push(itemId);
  state.toleranceBonus = Math.min(100, state.toleranceBonus + item.bonus);
  return { ok: true };
}
export function loyaltyBonus(state: GameState): number {
  return Math.min(100, state.ownedLoyaltyItems.reduce((sum, id) => sum + (loyaltyItemById(id)?.bonus ?? 0), 0));
}
