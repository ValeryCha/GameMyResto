import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import { arrivalRate } from '../src/simulation/guestFlow';
import { hireWaiter } from '../src/simulation/shop';
import { placeFurniture } from '../src/simulation/commands';

function equipRestaurant(state: ReturnType<typeof createGame>): void {
  hireWaiter(state);
  placeFurniture(state, 'counter', { x: 2, y: 1 });
}

function addServiceWithoutRating(state: ReturnType<typeof createGame>): void {
  state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
  state.furniture.push({ id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
}

describe('advanceSimulation', () => {
  it('гость без места уходит из очереди после истечения терпения и снижает рейтинг', () => {
    const state = createGame();
    state.furniture = state.furniture.filter((item) => !['chair', 'table'].includes(item.kind));
    addServiceWithoutRating(state);
    advanceSimulation(state, 1);
    state.arrivalProgress = -10_000;
    expect(state.customers[0].state).toBe('queueWaiting');
    const remaining = Math.ceil(state.customers[0].queuePatience!);
    advanceSimulation(state, remaining - 2); // Первый тик ожидания уже прошёл в тик прихода.
    expect(state.customers.find((guest) => guest.id === 'customer-1')).toBeDefined();
    advanceSimulation(state, 1);
    expect(state.customers.find((guest) => guest.id === 'customer-1')?.state).toBe('leaving');
    expect(state.popularity).toBe(8);
    advanceSimulation(state, 20);
    expect(state.customers.some((guest) => guest.id === 'customer-1'), JSON.stringify(state.customers)).toBe(false);
  });

  it('повар и официант завершают заказ с оплатой после покупок', () => {
    const state = createGame();
    equipRestaurant(state);
    advanceSimulation(state, 500);
    expect(state.coins).toBeGreaterThan(500);
    expect(state.experience).toBeGreaterThan(0);
    expect(state.orders.length).toBeLessThanOrEqual(state.customers.length);
  });

  it('два гостя не занимают один и тот же стул', () => {
    const state = createGame();
    addServiceWithoutRating(state);
    advanceSimulation(state, 1);
    expect(state.customers[0].seatId).toBe('chair-1');
    state.customers[0].state = 'waitingFood';
    advanceSimulation(state, 30);
    const reservations = state.customers.map((customer) => customer.seatId).filter(Boolean);
    expect(new Set(reservations).size).toBe(reservations.length);
    expect(state.customers[1]?.seatId).toBeUndefined();
  });

  it('гость без еды уходит через 120 секунд без оплаты', () => {
    const state = createGame();
    state.employees = state.employees.filter((employee) => employee.role !== 'chef');
    addServiceWithoutRating(state);
    state.completedQuestIds = ['quest-hire-waiter', 'quest-buy-counter']; // Награды за стартовые покупки не относятся к проверке.
    advanceSimulation(state, 1);
    state.arrivalProgress = -10_000; // Изолируем проверку foodWait от новых гостей и штрафов очереди.
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

  it('сохраняет явного первого гостя на тике 1 и вычитает единицу прогресса', () => {
    const state = createGame();
    advanceSimulation(state, 1);
    expect(state.customers.map((guest) => guest.id)).toEqual(['customer-1']);
    expect(state.arrivalProgress).toBeCloseTo(-1); // throughput = 0, поэтому прирост равен нулю.
  });

  it('делает не более одной попытки прихода за тик и сохраняет дробный остаток', () => {
    const state = createGame();
    addServiceWithoutRating(state);
    state.arrivalProgress = 1.25;
    const expectedRemainder = 0.25 + arrivalRate(state);
    advanceSimulation(state, 1);
    expect(state.customers).toHaveLength(1);
    expect(state.arrivalProgress).toBeCloseTo(expectedRemainder);
  });

  it('spawns a customer and eventually earns coins', () => {
    const state = createGame();
    equipRestaurant(state);
    advanceSimulation(state, 240);
    expect(state.customers.length).toBeGreaterThan(0);
    expect(state.coins).toBeGreaterThan(500);
    expect(state.experience).toBeGreaterThan(0);
  });

  it('ускоряет готовку за улучшение', () => {
    const state = createGame();
    state.upgrades.cooking = 1;
    state.customers.push({ id: 'guest-cooking', position: { x: 5, y: 5 }, state: 'ordering', patience: 300, seatId: 'chair-1' });
    advanceSimulation(state, 2);
    const order = state.orders[0];
    expect(order.state).toBe('cooking');
    expect(order.progress).toBeCloseTo(2 / 0.92);
  });

  it('растения увеличивают терпение новых гостей с пределом 50 процентов', () => {
    const state = createGame();
    for (let i = 0; i < 6; i += 1) {
      state.furniture.push({ id: `plant-${i}`, kind: 'plant', position: { x: i, y: 0 }, rotation: 0 });
    }
    advanceSimulation(state, 1);
    expect(state.customers[0].patience).toBeCloseTo(240 * 1.5 * 0.88 - 1);
    expect(state.customers[0].foodWait).toBeCloseTo(158.4);
  });

  it('не меняет терпение уже существующих гостей при покупке растения', () => {
    const state = createGame();
    advanceSimulation(state, 1);
    const patience = state.customers[0].patience;
    state.furniture.push({ id: 'plant-new', kind: 'plant', position: { x: 3, y: 3 }, rotation: 0 });
    expect(state.customers[0].patience).toBe(patience);
  });

  it('never lets energy or popularity leave their bounds', () => {
    const state = createGame();
    advanceSimulation(state, 1_000);
    for (const employee of state.employees) expect(employee.energy).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeGreaterThanOrEqual(0);
    expect(state.popularity).toBeLessThanOrEqual(100);
  });
});
