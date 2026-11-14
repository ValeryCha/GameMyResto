import type { GameState } from './types';

export function expandBounds(state: GameState): void {
  const door = state.furniture.find((item) => item.kind === 'door');
  if (door?.position.x === state.width - 1) door.position.x += 2;
  if (door?.position.y === state.height - 1) door.position.y += 2;
  state.width += 2;
  state.height += 2;
}
