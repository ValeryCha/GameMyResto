import { doorPatternById } from '../content/doors';
import { floorPatternById } from '../content/floors';
import { wallpaperById } from '../content/wallpapers';
import { applyDecorationRating, decorationRating } from './rating';
import type { CommandResult, GameState } from './types';

export function isWallCell(id: string, width: number, height: number): boolean {
  const match = /^(north|south|west|east)-(\d+)$/.exec(id);
  if (!match) return false;
  const index = Number(match[2]);
  const length = match[1] === 'north' || match[1] === 'south' ? width : height;
  return Number.isInteger(index) && index >= 0 && index < length;
}
/** Совместимый API: статичной считается любая клетка текущей границы ресторана. */
export function isStaticWallCell(id: string, width: number, height: number): boolean {
  return isWallCell(id, width, height);
}
export function buyWallpaper(state: GameState, wallpaperId: string): CommandResult {
  const wallpaper = wallpaperById(wallpaperId);
  if (!wallpaper) return { ok: false, reason: 'Обои не найдены' };
  if (state.level < wallpaper.level) return { ok: false, reason: `Нужен ${wallpaper.level} уровень` };
  if (state.coins < wallpaper.price) return { ok: false, reason: 'Недостаточно монет' };
  state.coins -= wallpaper.price;
  state.ownedWallpapers[wallpaperId] = (state.ownedWallpapers[wallpaperId] ?? 0) + 1;
  return { ok: true };
}
/** Выбирает узор, но не списывает монеты до клика по конкретной клетке. */
export function buyOrApplyWallpaper(state: GameState, wallpaperId: string): CommandResult {
  const wallpaper = wallpaperById(wallpaperId);
  if (!wallpaper) return { ok: false, reason: 'Обои не найдены' };
  if (state.level < wallpaper.level) return { ok: false, reason: `Нужен ${wallpaper.level} уровень` };
  state.activeWallpaperId = wallpaperId;
  return { ok: true };
}
export function applyWallpaper(state: GameState, wallCellId: string, wallpaperId: string): CommandResult {
  const wallpaper = wallpaperById(wallpaperId);
  if (!wallpaper) return { ok: false, reason: 'Обои не найдены' };
  if (state.level < wallpaper.level) return { ok: false, reason: `Нужен ${wallpaper.level} уровень` };
  if (!isStaticWallCell(wallCellId, state.width, state.height)) return { ok: false, reason: 'Эта клетка находится за границей ресторана' };
  const previous = state.appliedWallpapers.find((item) => item.wallCellId === wallCellId);
  if (previous?.wallpaperId === wallpaperId) return { ok: false, reason: 'Здесь уже наклеены эти обои' };
  const purchase = buyWallpaper(state, wallpaperId);
  if (!purchase.ok) return purchase;
  if (previous) applyDecorationRating(state, -decorationRating(wallpaperById(previous.wallpaperId)!.price));
  state.appliedWallpapers = state.appliedWallpapers.filter((item) => item.wallCellId !== wallCellId);
  state.appliedWallpapers.push({ wallCellId, wallpaperId });
  state.activeWallpaperId = wallpaperId;
  applyDecorationRating(state, decorationRating(wallpaper.price));
  return { ok: true };
}
export function removeWallpaper(state: GameState, wallCellId: string): CommandResult {
  const applied = state.appliedWallpapers.find((item) => item.wallCellId === wallCellId);
  if (!applied) return { ok: false, reason: 'На этой клетке нет обоев' };
  const wallpaper = wallpaperById(applied.wallpaperId);
  state.appliedWallpapers = state.appliedWallpapers.filter((item) => item.wallCellId !== wallCellId);
  if (state.activeWallpaperId === applied.wallpaperId) state.activeWallpaperId = state.appliedWallpapers.at(-1)?.wallpaperId ?? null;
  if (wallpaper) applyDecorationRating(state, -decorationRating(wallpaper.price));
  return { ok: true };
}
export function buyOrApplyFloor(state: GameState, floorId: string): CommandResult {
  const floor = floorPatternById(floorId);
  if (!floor) return { ok: false, reason: 'Покрытие не найдено' };
  if (state.level < floor.level) return { ok: false, reason: `Нужен ${floor.level} уровень` };
  if (!state.ownedFloorPatterns.includes(floorId)) {
    if (state.coins < floor.price) return { ok: false, reason: 'Недостаточно монет' };
    state.coins -= floor.price; state.ownedFloorPatterns.push(floorId);
  }
  if (state.activeFloorPattern === floorId) return { ok: true };
  const previous = state.activeFloorPattern ? floorPatternById(state.activeFloorPattern) : undefined;
  if (previous) applyDecorationRating(state, -decorationRating(previous.price));
  state.activeFloorPattern = floorId; applyDecorationRating(state, decorationRating(floor.price)); return { ok: true };
}
export function removeFloor(state: GameState): CommandResult {
  const floor = state.activeFloorPattern ? floorPatternById(state.activeFloorPattern) : undefined;
  if (!floor) return { ok: false, reason: 'Пол не установлен' };
  state.activeFloorPattern = null;
  applyDecorationRating(state, -decorationRating(floor.price)); return { ok: true };
}
export function buyOrApplyDoor(state: GameState, doorId: string): CommandResult {
  const door = doorPatternById(doorId);
  if (!door) return { ok: false, reason: 'Дверь не найдена' };
  if (state.level < door.level) return { ok: false, reason: `Нужен ${door.level} уровень` };
  if (!state.ownedDoorPatterns.includes(doorId)) {
    if (state.coins < door.price) return { ok: false, reason: 'Недостаточно монет' };
    state.coins -= door.price; state.ownedDoorPatterns.push(doorId);
  }
  if (state.activeDoorPattern === doorId) return { ok: true };
  const previous = state.activeDoorPattern ? doorPatternById(state.activeDoorPattern) : undefined;
  if (previous) applyDecorationRating(state, -decorationRating(previous.price));
  state.activeDoorPattern = doorId; applyDecorationRating(state, decorationRating(door.price)); return { ok: true };
}
export function removeDoorPattern(state: GameState): CommandResult {
  const door = state.activeDoorPattern ? doorPatternById(state.activeDoorPattern) : undefined;
  if (!door) return { ok: false, reason: 'Установлена стандартная дверь' };
  state.activeDoorPattern = null;
  applyDecorationRating(state, -decorationRating(door.price)); return { ok: true };
}
