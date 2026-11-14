import { expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { getHudModel } from '../src/simulation/selectors';

it('formats Russian HUD values without mutating state', () => {
  const state = createGame();
  expect(getHudModel(state)).toEqual({ coins: 1000, experience: 0, level: 1, popularity: '10.0', guests: 0 });
});
