import { CATALOG } from '../content/coreContent';
import { floorPatternById } from '../content/floors';
import { doorPatternById } from '../content/doors';
import { wallpaperById } from '../content/wallpapers';
import { furnitureSkinById } from '../content/furnitureSkins';
import { windowById } from '../content/windows';
import { paintingById } from '../content/paintings';
import type { GameState } from './types';

/** Небольшая прибавка за дешёвый декор и заметная — за премиальный. */
export const decorationRating = (price: number): number => Math.max(1, Math.round(price / 500));
export function applyDecorationRating(state: GameState, delta: number): void {
  state.decorationRatingBonus = Math.max(0, state.decorationRatingBonus + delta);
  state.popularity = Math.max(0, Math.min(100, state.popularity + delta));
}
export function calculateDecorationRating(state: GameState): number {
  let rating = state.furniture.reduce((sum, item) => sum + (item.kind === 'plant' ? decorationRating(CATALOG.plant.price) : 0), 0);
  for (const applied of state.appliedWallpapers ?? []) rating += decorationRating(wallpaperById(applied.wallpaperId)?.price ?? 0);
  const door = state.activeDoorPattern ? doorPatternById(state.activeDoorPattern) : undefined;
  if (door) rating += decorationRating(door.price);
  const floor = state.activeFloorPattern ? floorPatternById(state.activeFloorPattern) : undefined;
  if (floor) rating += decorationRating(floor.price);
  const assignments = [...state.appliedFurnitureSkins ?? [], ...state.appliedStoveSkins ?? [], ...state.appliedCounterSkins ?? []];
  for (const assignment of assignments) rating += decorationRating(furnitureSkinById(assignment.skinId)?.price ?? 0);
  for (const assignment of [...state.appliedChefSkins ?? [], ...state.appliedWaiterSkins ?? []]) rating += decorationRating(furnitureSkinById(assignment.skinId)?.price ?? 0);
  for (const placed of state.appliedPaintings ?? []) rating += decorationRating(paintingById(placed.paintingId)?.price ?? 0);
  for (const placed of state.appliedWindows ?? []) rating += decorationRating(windowById(placed.windowId)?.price ?? 0);
  return rating;
}
