import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import { hireWaiter } from '../src/simulation/shop';
import { placeFurniture } from '../src/simulation/commands';

function equipRestaurant(state: ReturnType<typeof createGame>): void {
  hireWaiter(state);
  placeFurniture(state, 'counter', { x: 2, y: 1 });
}

describe('advanceSimulation', () => {
  it('гость без места уходит через 300 секунд и снижает рейтинг', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => !['chair', 'table'].includes(item.kind));
    advanceSimulation(state, 1);
    expect(state.customers[0].state).toBe('seekingSeat');
    advanceSimulation(state, 299);
    expect(state.customers.find((guest) => guest.id === 'customer-1')).toBeDefined();
    advanceSimulation(state, 1);
    expect(state.customers.find((guest) => guest.id === 'customer-1')?.state).toBe('leaving');
    expect(state.popularity).toBe(9);
    advanceSimulation(state, 20);
    expect(state.customers.some((guest) => guest.id === 'customer-1')).toBe(false);
  });

  it('повар и официант завершают заказ с оплатой после покупок', () => {
    const state = createGame();
    equipRestaurant(state);
    advanceSimulation(state, 500);
    expect(state.coins).toBeGreaterThan(500);
    expect(state.experience).toBeGreaterThan(0);
    expect(state.orders.some((order) => order.state === 'delivered')).toBe(true);
  });

  it('два гостя не занимают один и тот же стул', () => {
    const state = createGame();
    advanceSimulation(state, 1);
    expect(state.customers[0].seatId).toBe('chair-1');
    state.customers[0].state = 'waitingFood';
    advanceSimulation(state, 30);
    const reservations = state.customers.map((customer) => customer.seatId).filter(Boolean);
    expect(new Set(reservations).size).toBe(reservations.length);
    expect(state.customers.find((guest) => guest.id === 'customer-31')?.seatId).toBeUndefined();
  });

  it('гость без еды уходит через 120 секунд без оплаты', () => {
    const state = createGame();
    state.employees = state.employees.filter((employee) => employee.role !== 'chef');
    advanceSimulation(state, 180);
    expect(state.coins).toBe(1_000);
    expect(state.popularity).toBe(9);
    expect(state.customers.some((guest) => guest.id === 'customer-1')).toBe(false);
  });

  it('не исчезает готовый заказ без стойки и официанта', () => {
    const state = createGame();
    advanceSimulation(state, 80);
    expect(state.orders.some((order) => order.state === 'cooking' && order.progress > 0)).toBe(true);
    expect(state.coins).toBe(1_000);
  });

  it('рейтинг сокращает интервал появления до 18 секунд', () => {
    const state = createGame();
    state.popularity = 100;
    advanceSimulation(state, 19);
    expect(state.customers).toHaveLength(2);
  });

  it('spawns a customer and eventually earns coins', () => {
    const state = createGame();
    equipRestaurant(state);
    advanceSimulation(state, 240);
    expect(state.customers.length).toBeGreaterThan(0);
    expect(state.coins).toBeGreaterThan(500);
    expect(state.experience).toBeGreaterThan(0);
  });

  it('never lets energy or popularity leave their bounds', () => {
    const state = createGame();
    advanceSimulation(state, 1_000);
    for (const employee of state.employees) expect(employee.energy).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeLessThanOrEqual(100);
  });
});
