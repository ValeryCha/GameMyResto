import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { createGuestOrder } from '../src/simulation/orders';
import { advanceSimulation } from '../src/simulation/tick';

function restaurantWithGuest() {
  const state = createGame();
  state.arrivalProgress = -10_000;
  state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 3, y: 3 }, energy: 100 });
  state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 });
  const guest = { id: 'guest-1', position: { x: 5, y: 5 }, state: 'waitingFood' as const, patience: 10_000, foodWait: 10_000, seatId: 'chair-1' };
  state.customers.push(guest);
  const order = createGuestOrder(state, guest)!;
  return { state, guest, order };
}

describe('жизненный цикл заказа через официанта и повара', () => {
  it('официант принимает заказ у гостя, относит повару и только потом начинается готовка', () => {
    const { state, order } = restaurantWithGuest();
    const transitions: string[] = [order.state];
    const waiter = state.employees.find((employee) => employee.role === 'waiter')!;
    let cookingStartedBeforeHandoff = false;

    for (let tick = 0; tick < 200 && order.state !== 'delivered'; tick += 1) {
      const previous = order.state;
      advanceSimulation(state, 1);
      if (['waitingWaiter', 'takingOrder'].includes(previous) && order.state === 'cooking') cookingStartedBeforeHandoff = true;
      if (order.state !== previous) transitions.push(order.state);
    }

    expect(cookingStartedBeforeHandoff).toBe(false);
    expect(transitions).toEqual(['waitingWaiter', 'takingOrder', 'waitingCook', 'cooking', 'waitingDelivery', 'delivered']);
    expect(waiter.taskId).toBeUndefined();
  });

  it('повар относит готовое блюдо на ближайшую к плите стойку', () => {
    const state = createGame();
    state.tick = 1;
    state.arrivalProgress = -10_000;
    state.employees[0].position = { x: 1, y: 2 };
    state.furniture.push(
      { id: 'counter-1', kind: 'counter', position: { x: 2, y: 1 }, rotation: 0 },
      { id: 'counter-2', kind: 'counter', position: { x: 3, y: 1 }, rotation: 0 },
      { id: 'counter-3', kind: 'counter', position: { x: 4, y: 1 }, rotation: 0 },
    );
    state.orders.push({ id: 'order-1', customerId: 'guest-1', state: 'cooking', progress: 0, dishId: 'soup' });
    const order = state.orders[0];

    for (let index = 0; index < 5; index += 1) {
      order.state = 'waitingCook';
      order.progress = 0;
      order.stoveId = undefined;
      order.counterId = undefined;
      order.deliveryProgress = 0;
      state.employees[0].taskId = undefined;
      advanceSimulation(state, 20);
      expect(order.state).toBe('waitingDelivery');
      expect(order.counterId).toBe('counter-1');
    }
  });
});
