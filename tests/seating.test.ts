import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { findSeat, isSeatCurrent } from '../src/simulation/seating';
import { advanceSimulation } from '../src/simulation/tick';
import type { Customer } from '../src/simulation/types';

function guest(state: ReturnType<typeof createGame>): Customer {
  const customer: Customer = { id: 'guest-test', position: { x: 0, y: 6 }, state: 'seekingSeat', patience: 300 };
  state.customers.push(customer);
  return customer;
}

describe('посадка на актуальную мебель', () => {
  it('не считает отдельный стул местом без соседнего стола', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => item.kind !== 'table');
    expect(findSeat(state, guest(state))).toBeUndefined();
  });

  it('находит стул рядом с двойным столом при любом повороте', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => !['table', 'chair'].includes(item.kind));
    state.furniture.push(
      { id: 'double', kind: 'tableDouble', position: { x: 4, y: 4 }, rotation: 90 },
      { id: 'double-chair', kind: 'chair', position: { x: 5, y: 5 }, rotation: 0 },
    );
    expect(findSeat(state, guest(state))?.table.id).toBe('double');
  });

  it('не предлагает зарезервированный стул другому гостю', () => {
    const state = createGame();
    const first = guest(state);
    first.id = 'first';
    first.seatId = 'chair-1';
    const second: Customer = { ...first, id: 'second', seatId: undefined };
    state.customers.push(second);
    expect(findSeat(state, second)).toBeUndefined();
  });

  it('отменяет бронь после перемещения стула от стола', () => {
    const state = createGame();
    const customer = guest(state);
    customer.seatId = 'chair-1';
    state.furniture.find((item) => item.id === 'chair-1')!.position = { x: 1, y: 6 };
    expect(isSeatCurrent(state, customer)).toBe(false);
  });

  it('фактически садится на клетку стула перед заказом', () => {
    const state = createGame();
    const customer = guest(state);
    for (let i = 0; i < 30 && !customer.orderId; i += 1) advanceSimulation(state);
    expect(customer.state).toBe('waitingFood');
    expect(customer.position).toEqual({ x: 5, y: 5 });
    expect(customer.seatId).toBe('chair-1');
    expect(state.orders[0]?.customerId).toBe(customer.id);
  });
});
