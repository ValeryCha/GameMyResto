import type { GameState } from './types';

/** Новые участки продолжают узор своей стены без повторной покупки. */
export function inheritExpandedWallpapers(state: GameState, previousWidth: number, previousHeight: number): void {
  if (!state.appliedWallpapers.length) return;
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const previousLength = side === 'north' || side === 'south' ? previousWidth : previousHeight;
    const nextLength = side === 'north' || side === 'south' ? state.width : state.height;
    let wallpaperId: string | null = null;
    for (let index = previousLength - 1; index >= 0 && !wallpaperId; index -= 1) {
      wallpaperId = state.appliedWallpapers.find((item) => item.wallCellId === `${side}-${index}`)?.wallpaperId ?? null;
    }
    wallpaperId ??= state.activeWallpaperId;
    if (!wallpaperId) continue;
    for (let index = previousLength; index < nextLength; index += 1) {
      const wallCellId = `${side}-${index}`;
      if (!state.appliedWallpapers.some((item) => item.wallCellId === wallCellId)) state.appliedWallpapers.push({ wallCellId, wallpaperId });
    }
  }
}

export function expandBounds(state: GameState): void {
  const previousWidth = state.width;
  const previousHeight = state.height;
  const door = state.furniture.find((item) => item.kind === 'door');
  if (door?.position.x === state.width - 1) door.position.x += 2;
  if (door?.position.y === state.height - 1) door.position.y += 2;
  state.width += 2;
  state.height += 2;
  inheritExpandedWallpapers(state, previousWidth, previousHeight);
  state.wallpaperExpansionNormalized = true;
}
