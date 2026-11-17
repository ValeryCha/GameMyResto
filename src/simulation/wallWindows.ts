import { paintingById } from '../content/paintings';
import { windowById } from '../content/windows';
import { paintingWallCells } from './catalogDecorations';
import { isStaticWallCell } from './decorations';
import { applyDecorationRating, decorationRating } from './rating';
import type { AppliedWindow, CommandResult, GameState } from './types';

export function buyWindow(state: GameState, windowId: string): CommandResult {
  const item = windowById(windowId);
  if (!item) return { ok: false, reason: 'Окно не найдено' };
  if (state.level < item.level) return { ok: false, reason: `Нужен ${item.level} уровень` };
  if (state.coins < item.price) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= item.price;
  state.ownedWindows.push(windowId);
  return { ok: true };
}
export function windowWallCells(item: { widthCells: number }, side: AppliedWindow['side'], index: number, width: number, height: number): string[] {
  const length = side === 'north' || side === 'south' ? width : height;
  if (!Number.isInteger(index) || index < 0 || index + item.widthCells > length) return [];
  return Array.from({ length: item.widthCells }, (_, offset) => `${side}-${index + offset}`);
}
function placementError(state: GameState, item: NonNullable<ReturnType<typeof windowById>>, side: AppliedWindow['side'], index: number, ignoreId?: string): string | undefined {
  const cells = windowWallCells(item, side, index, state.width, state.height);
  if (!cells.length) return 'Окно не помещается на этой стене';
  if (cells.some((cell) => !isStaticWallCell(cell, state.width, state.height))) return 'Окно не помещается на этой стене';
  if (item.heightCells > 1 && (side === 'south' || side === 'east')) return 'Высокое окно помещается только на высокой стене';
  if (state.appliedWindows.some((placed) => placed.id !== ignoreId && windowWallCells(windowById(placed.windowId)!, placed.side, placed.index, state.width, state.height).some((cell) => cells.includes(cell)))) return 'Этот участок уже занят окном';
  if (state.appliedPaintings.some((placed) => paintingWallCells(paintingById(placed.paintingId)!, placed, state.width, state.height).some((cell) => cells.includes(cell)))) return 'Этот участок занят картиной';
  const door = state.furniture.find((placed) => placed.kind === 'door');
  const doorCell = door ? door.position.y === 0 ? `north-${door.position.x}` : door.position.y === state.height - 1 ? `south-${door.position.x}` : door.position.x === 0 ? `west-${door.position.y}` : `east-${door.position.y}` : '';
  return cells.includes(doorCell) ? 'Нельзя закрывать дверь окном' : undefined;
}
export function placeWindow(state: GameState, windowId: string, side: AppliedWindow['side'], index: number): CommandResult {
  const item = windowById(windowId);
  if (!item || !state.ownedWindows.includes(windowId)) return { ok: false, reason: 'Сначала купите окно' };
  const error = placementError(state, item, side, index);
  if (error) return { ok: false, reason: error };
  let sequence = state.appliedWindows.length;
  let id = `window-${state.tick}-${sequence}`;
  while (state.appliedWindows.some((placed) => placed.id === id)) { sequence += 1; id = `window-${state.tick}-${sequence}`; }
  state.appliedWindows.push({ id, windowId, side, index });
  applyDecorationRating(state, decorationRating(item.price));
  return { ok: true };
}
export function moveWindow(state: GameState, id: string, side: AppliedWindow['side'], index: number): CommandResult {
  const placed = state.appliedWindows.find((item) => item.id === id);
  if (!placed) return { ok: false, reason: 'Окно не найдено' };
  const item = windowById(placed.windowId)!;
  const error = placementError(state, item, side, index, id);
  if (error) return { ok: false, reason: error };
  placed.side = side; placed.index = index;
  return { ok: true };
}
export function removeWindow(state: GameState, id: string): CommandResult {
  const placed = state.appliedWindows.find((item) => item.id === id);
  if (!placed) return { ok: false, reason: 'Окно не найдено' };
  const item = windowById(placed.windowId)!;
  state.appliedWindows = state.appliedWindows.filter((candidate) => candidate.id !== id);
  state.coins += Math.floor(item.price / 2);
  applyDecorationRating(state, -decorationRating(item.price));
  return { ok: true };
}
