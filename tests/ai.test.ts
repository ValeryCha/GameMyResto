import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { nextRandom } from '../src/simulation/random';
import { chooseGuestAction } from '../src/simulation/ai';
import type { Customer } from '../src/simulation/types';

function guest(state: ReturnType<typeof createGame>): Customer {
  const customer: Customer = { id: 'guest', position: { x: 0, y: 6 }, state: 'waiting', patience: 300 };
  state.customers.push(customer);
  return customer;
}

describe('детерминированный utility AI', () => {
  it('повторяет последовательность случайных чисел по seed', () => {
    const a = createGame();
    const b = createGame();
    expect([nextRandom(a), nextRandom(a)]).toEqual([nextRandom(b), nextRandom(b)]);
  });

  it('без свободного места выбирает только прогулку или осмотр', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(['wander', 'inspect']).toContain(chooseGuestAction(state, guest(state)));
  });

  it('нулевое терпение имеет абсолютный приоритет ухода', () => {
    const state = createGame();
    const customer = guest(state);
    customer.patience = 0;
    expect(chooseGuestAction(state, customer)).toBe('leave');
  });

  it('начинает заказ только после размещения за столом', () => {
    const state = createGame();
    const customer = guest(state);
    customer.state = 'ordering';
    expect(chooseGuestAction(state, customer)).toBe('order');
  });
});
