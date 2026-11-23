import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { experienceThreshold, processProgression } from '../src/simulation/progression';
import { placeFurniture, removeFurniture } from '../src/simulation/commands';
import { advanceSimulation } from '../src/simulation/tick';
import { countUsableSeats } from '../src/simulation/guestFlow';
import type { FurnitureKind, GameState } from '../src/simulation/types';

const LAYOUT: Array<[FurnitureKind, number, number]> = [
  ['table', 3, 2],
  ['chair', 2, 2],
  ['chair', 3, 3],
  ['table', 6, 2],
  ['chair', 6, 3],
  ['chair', 7, 2],
  ['tableDouble', 2, 5],
  ['chair', 1, 5],
  ['chair', 2, 6],
  ['chair', 3, 6],
  ['chair', 4, 5],
  ['tableDouble', 6, 5],
  ['chair', 5, 5],
  ['chair', 6, 6],
  ['chair', 7, 6],
  ['chair', 8, 5],
];

describe('плотная планировка: 4 стола + 12 стульев', () => {
  function setupDenseLayout(): GameState {
    const state = createGame();
    state.level = 4;
    state.experience = experienceThreshold(4) + 1;
    processProgression(state);
    expect(state.level).toBe(5);
    expect([state.width, state.height]).toEqual([10, 10]);

    expect(removeFurniture(state, 'table-1').ok).toBe(true);
    expect(removeFurniture(state, 'chair-1').ok).toBe(true);
    state.coins = 10_000;
    expect(placeFurniture(state, 'counter', { x: 1, y: 2 }).ok).toBe(true);
    state.employees.push({ id: 'waiter-layout', role: 'waiter', position: { x: 2, y: 3 }, energy: 100 });
    for (const [kind, x, y] of LAYOUT) {
      expect(placeFurniture(state, kind, { x, y }), `${kind} (${x}, ${y})`).toMatchObject({ ok: true });
    }
    return state;
  }

  it('расширяется до 10×10 и расставляет 4 стола и 12 стульев без ошибок', () => {
    const state = setupDenseLayout();
    expect(state.furniture.filter((item) => item.kind === 'table' || item.kind === 'tableDouble')).toHaveLength(4);
    expect(state.furniture.filter((item) => item.kind === 'chair')).toHaveLength(12);
    // Дверь (0, 7) стоит на нижней границе 8×8, поэтому expandBounds сдвигает её вниз.
    expect(state.furniture.find((item) => item.kind === 'door')?.position).toEqual({ x: 0, y: 9 });
  });

  it('capacity = 12: все стулья пригодны', () => {
    expect(countUsableSeats(setupDenseLayout())).toBe(12);
  });

  it('за 600 тиков обслуживает новых гостей и не оставляет застрявших', () => {
    const state = setupDenseLayout();
    const before = state.servedTotal;
    advanceSimulation(state, 600);
    expect(state.servedTotal, JSON.stringify({ customers: state.customers, orders: state.orders })).toBeGreaterThan(before);
    const stuck = state.customers.filter((customer) =>
      customer.state === 'seekingSeat' && !customer.seatId && !customer.target);
    expect(stuck, JSON.stringify(stuck)).toHaveLength(0);
  });
});
