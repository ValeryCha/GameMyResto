import type { GameState } from './types';

export function createGame(): GameState {
  return {
    version: 1, coins: 1_000, experience: 0, popularity: 10, tick: 0, width: 8, height: 8,
    randomSeed: 123456789, guestLimit: 7,
    employees: [
      { id: 'chef-1', role: 'chef', position: { x: 2, y: 2 }, energy: 100 },
    ],
    furniture: [
      { id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 },
      { id: 'stove-1', kind: 'stove', position: { x: 1, y: 1 }, rotation: 0 },
      { id: 'table-1', kind: 'table', position: { x: 5, y: 4 }, rotation: 0 },
      { id: 'chair-1', kind: 'chair', position: { x: 5, y: 5 }, rotation: 0 },
    ],
    customers: [], orders: [],
  };
}
