import { describe, expect, it } from 'vitest';
import { DISHES } from '../src/content/dishes';
import { createGame } from '../src/simulation/createGame';
import { createGuestOrder, paymentFor, selectGuestDish, settleOrder } from '../src/simulation/orders';
import type { Customer } from '../src/simulation/types';

const guest = (id: string): Customer => ({
  id, position: { x: 5, y: 5 }, state: 'ordering', patience: 300, seatId: 'chair-1',
});

describe('желания и оплата', () => {
  it('создаёт желания примерно у 5 процентов гостей', () => {
    const state = createGame();
    let desires = 0;
    for (let i = 0; i < 1000; i += 1) {
      if (selectGuestDish(state, guest(`g${i}`))?.desired) desires += 1;
    }
    expect(desires).toBeGreaterThan(25);
    expect(desires).toBeLessThan(80);
  });

  it('недоступное желание отправляет гостя блуждать 240 секунд без штрафа', () => {
    const state = createGame();
    state.level = 2;
    state.satisfiedStreak = 4;
    const customer = { ...guest('wish'), hasDesire: true, desiredDishId: 'pasta' };
    expect(createGuestOrder(state, customer)).toBeUndefined();
    expect(customer.state).toBe('wandering');
    expect(customer.waitingForRecipe).toBe(true);
    expect(customer.patience).toBe(240);
    expect(state.popularity).toBe(10);
    expect(state.unhappyTotal).toBe(0);
    expect(state.satisfiedStreak).toBe(4);
    expect(state.orders).toHaveLength(0);
  });

  it('купленное желание становится заказом именно на это блюдо', () => {
    const state = createGame();
    state.level = 2;
    state.unlockedDishIds.push('pasta');
    const customer = { ...guest('wish'), hasDesire: true, desiredDishId: 'pasta' };
    const order = createGuestOrder(state, customer)!;
    expect(order.dishId).toBe('pasta');
    expect(order.desired).toBe(true);
    expect(customer.state).toBe('waitingFood');
    expect(state.orders).toContain(order);
  });

  it('обычный гость заказывает только купленные блюда', () => {
    const state = createGame();
    state.level = 33;
    for (let i = 0; i < 30; i += 1) {
      const selection = selectGuestDish(state, guest(`ordinary-${i}`));
      if (!selection?.desired) expect(selection?.dish.id).toBe('soup');
    }
  });

  it('платит ×5 и до 20 процентов чаевых, обновляя статистику', () => {
    const state = createGame();
    state.popularity = 100;
    // tick 100 — вне пика, проверяется базовая оплата без peak-множителя.
    state.tick = 100;
    expect(paymentFor(state, DISHES[0], true)).toBe(30);
    expect(paymentFor(state, DISHES[0], false)).toBe(6);
    const customer = guest('paid');
    const order = createGuestOrder(state, { ...customer, hasDesire: true, desiredDishId: 'soup' })!;
    const revenue = settleOrder(state, customer, order);
    expect(revenue).toBe(30);
    expect(state.coins).toBe(1030);
    expect(state.revenueTotal).toBe(30);
    expect(state.servedTotal).toBe(1);
    expect(state.desiredServedTotal).toBe(1);
    expect(state.satisfiedStreak).toBe(1);
    expect(customer.state).toBe('leaving');
  });
});
