import { expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { createGuestOrder, selectGuestDish } from '../src/simulation/orders';
import { buyRecipe } from '../src/simulation/shop';
import { advanceSimulation } from '../src/simulation/tick';
import type { Customer } from '../src/simulation/types';

const wishingGuest = (): Customer => ({
  id: 'wish', position: { x: 5, y: 5 }, state: 'ordering', patience: 300,
  seatId: 'chair-1', hasDesire: true, desiredDishId: 'pasta',
});

it('желания выбираются только из купленных и сразу включают новый рецепт', () => {
  const state = createGame();
  state.level = 33;
  const before = Array.from({ length: 100 }, (_, index) => selectGuestDish(state, {
    id: `before-${index}`, position: { x: 5, y: 5 }, state: 'ordering', patience: 300, hasDesire: true,
  })?.dish.id);
  expect(new Set(before)).toEqual(new Set(['soup']));

  state.level = 2;
  expect(buyRecipe(state, 'pasta').ok).toBe(true);
  const after = Array.from({ length: 100 }, (_, index) => selectGuestDish(state, {
    id: `after-${index}`, position: { x: 5, y: 5 }, state: 'ordering', patience: 300, hasDesire: true,
  })?.dish.id);
  expect(new Set(after)).toEqual(new Set(['soup', 'pasta']));
});

it('гость с недоступным желанием реально перемещается и уходит нейтрально через 240 секунд', () => {
  const state = createGame();
  state.tick = 2;
  state.level = 2;
  state.arrivalProgress = -10_000;
  state.customers.push(wishingGuest());
  const positions = new Set<string>();

  advanceSimulation(state, 1);
  for (let step = 0; step < 20; step += 1) {
    advanceSimulation(state, 1);
    const guest = state.customers.find((item) => item.id === 'wish')!;
    positions.add(`${guest.position.x},${guest.position.y}`);
  }
  expect(positions.size).toBeGreaterThan(1);
  advanceSimulation(state, 220);
  expect(state.customers.find((guest) => guest.id === 'wish')?.state).toBe('leaving');
  expect(state.popularity).toBe(100);
  expect(state.unhappyTotal).toBe(0);
  advanceSimulation(state, 30);
  expect(state.customers.some((guest) => guest.id === 'wish')).toBe(false);
});

it('покупка недостающего рецепта во время прогулки возобновляет посадку и заказ', () => {
  const state = createGame();
  state.tick = 2;
  state.level = 2;
  const guest = wishingGuest();
  state.customers.push(guest);
  advanceSimulation(state, 1);
  expect(guest.waitingForRecipe).toBe(true);

  expect(buyRecipe(state, 'pasta').ok).toBe(true);
  advanceSimulation(state, 5);

  expect(guest.waitingForRecipe).toBe(false);
  expect(guest.orderId).toBe('order-wish');
  expect(state.orders.find((order) => order.id === guest.orderId)?.dishId).toBe('pasta');
});

it('купленное желаемое блюдо проходит приготовление, доставку и оплату ×5', () => {
  const state = createGame();
  state.coins += 10_000;
  state.level = 2;
  state.popularity = 0;
  expect(buyRecipe(state, 'pasta').ok).toBe(true);
  state.furniture.push({ id: 'counter', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
  state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 2, y: 2 }, energy: 100 });
  state.customers.push(wishingGuest());
  state.tick = 1;
  state.arrivalProgress = -10_000;

  advanceSimulation(state, 100);

  expect(state.desiredServedTotal).toBe(1);
  // Оплата на tick 20 — внутри пика, tipMultiplier ×1.5.
  expect(state.revenueTotal).toBe(53);
  expect(state.satisfiedStreak).toBe(1);
});
