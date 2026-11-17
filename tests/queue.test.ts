import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { beginPeak } from '../src/simulation/peak';
import { advanceQueuedGuest, enqueueGuest, QUEUE_LIMIT } from '../src/simulation/queue';
import { advanceSimulation } from '../src/simulation/tick';
import { normalizeState } from '../src/persistence/normalizeState';
import type { Customer, GameState } from '../src/simulation/types';

function guest(id: string): Customer {
  return { id, position: { x: 1, y: 7 }, state: 'seekingSeat', patience: 240 };
}

function addGuest(state: GameState, id: string): Customer {
  const customer = guest(id);
  state.customers.push(customer);
  enqueueGuest(state, customer);
  return customer;
}

describe('очередь у входа', () => {
  it('ограничена пятью гостями и применяет отказ −10 без двойного unhappy', () => {
    const state = createGame();
    state.popularity = 500;
    state.satisfiedStreak = 4;
    state.ownedLoyaltyItems = ['plant'];
    state.tick = 1;
    beginPeak(state);
    for (let i = 0; i < QUEUE_LIMIT; i += 1) addGuest(state, `queued-${i}`);
    expect(state.guestQueue).toHaveLength(5);
    expect(state.customers[0].queuePatience).toBe(90); // patienceBonus не применяется.

    const rejected = addGuest(state, 'rejected');

    expect(rejected.state).toBe('leaving');
    expect(state.guestQueue).toHaveLength(5);
    expect(state.popularity).toBe(490);
    expect(state.satisfiedStreak).toBe(0);
    expect(state.unhappyTotal).toBe(1);
    expect(state.queueRejectedTotal).toBe(1);
    expect(state.peakState.current?.unhappy).toBe(1);
    expect(state.peakState.current?.queueRejected).toBe(1);
    expect(state.peakState.current?.queueTimeout).toBe(0);
  });

  it('при обычном таймауте применяет −20 и отдельно учитывает событие пика', () => {
    const state = createGame();
    state.popularity = 500;
    state.tick = 1;
    beginPeak(state);
    const customer = addGuest(state, 'timeout');
    customer.queuePatience = 2;

    expect(advanceQueuedGuest(state, customer, { x: 0, y: 7 })).toBe(true);
    expect(state.popularity).toBe(500);
    expect(advanceQueuedGuest(state, customer, { x: 0, y: 7 })).toBe(false);

    expect(customer.state).toBe('leaving');
    expect(state.guestQueue).toEqual([]);
    expect(state.popularity).toBe(480);
    expect(state.unhappyTotal).toBe(1);
    expect(state.queueTimeoutTotal).toBe(1);
    expect(state.peakState.current?.unhappy).toBe(1);
    expect(state.peakState.current?.queueTimeout).toBe(1);
    expect(state.peakState.current?.queueRejected).toBe(0);
  });

  it('ограничивает штраф повторного таймаута значением −50', () => {
    const state = createGame();
    state.popularity = 500;
    const customer = addGuest(state, 'timeout-cap');
    customer.queuePatience = 1;
    customer.queueWaitedTicks = 4;

    advanceQueuedGuest(state, customer, { x: 0, y: 7 });

    expect(state.popularity).toBe(450);
    expect(state.queueTimeoutTotal).toBe(1);
  });

  it('посадка идёт по FIFO, суммирует ожидание и останавливает его таймер при движении', () => {
    const state = createGame();
    state.tick = 100;
    state.arrivalProgress = -10_000;
    const occupant = guest('occupant');
    occupant.state = 'waitingFood';
    occupant.seatId = 'chair-1';
    state.customers.push(occupant);
    const first = addGuest(state, 'first');
    const second = addGuest(state, 'second');
    first.queueWaitedTicks = 7;
    second.queueWaitedTicks = 3;
    occupant.seatId = undefined;
    occupant.state = 'leaving';

    advanceSimulation(state, 1);

    expect(first.seatId).toBe('chair-1');
    expect(first.state).toBe('seekingSeat');
    expect(first.queueWaitedTicks).toBe(8);
    expect(second.state).toBe('queueWaiting');
    expect(state.guestQueue).toEqual(['second']);
    expect(state.queueSeatedTotal).toBe(1);
    expect(state.queueWaitTicksTotal).toBe(8);

    advanceSimulation(state, 1);
    expect(first.queueWaitedTicks).toBe(8);
    expect(state.queueWaitTicksTotal).toBe(8);
  });

  it('нормализует старый сейв, FIFO, неизвестные ID, дубли и таймеры', () => {
    const state = createGame() as Partial<GameState>;
    delete state.guestQueue;
    delete state.queueRejectedTotal;
    delete state.queueTimeoutTotal;
    delete state.queueSeatedTotal;
    delete state.queueWaitTicksTotal;
    const first = guest('first');
    const second = guest('second');
    const third = guest('third');
    first.state = 'queueWaiting';
    second.state = 'queueWaiting';
    third.state = 'queueWaiting';
    first.queueWaitedTicks = -10;
    first.queueEnteredAt = Number.NaN;
    first.queuePatience = Number.POSITIVE_INFINITY;
    state.customers!.push(first, second, third);
    state.guestQueue = ['second', 'missing', 'second', 'first'];

    normalizeState(state as GameState);

    expect(state.guestQueue).toEqual(['second', 'first', 'third']);
    expect(state.queueRejectedTotal).toBe(0);
    expect(state.queueTimeoutTotal).toBe(0);
    expect(state.queueSeatedTotal).toBe(0);
    expect(state.queueWaitTicksTotal).toBe(0);
    expect(first.queueWaitedTicks).toBe(0);
    expect(first.queueEnteredAt).toBe(0);
    expect(first.queuePatience).toBe(90 * (0.85 + 0.3 * state.popularity! / 1000));
    expect(first.seatId).toBeUndefined();
  });

  it('новый гость без свободных мест сразу входит в очередь и освобождает дверь', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => !['chair', 'table'].includes(item.kind));

    advanceSimulation(state, 1);

    expect(state.guestQueue).toEqual(['customer-1']);
    expect(state.customers[0].state).toBe('queueWaiting');
    expect(state.customers[0].position).toEqual({ x: 1, y: 7 });
    expect(state.customers[0].queuePatience).toBeCloseTo(90 * (0.85 + 0.3 * 10 / 100));
  });
});
