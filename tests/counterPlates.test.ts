import { describe, expect, it } from 'vitest';
import { DISHES } from '../src/content/dishes';
import { createGame } from '../src/simulation/createGame';
import { COUNTER_MAX_SLOTS, counterPlateDishes } from '../src/simulation/counterService';
import type { GameState, Order } from '../src/simulation/types';

function scene(): GameState {
  const state = createGame();
  state.orders = [];
  state.customers = [];
  return state;
}

function readyOrder(id: string, dishId: string, counterId = 'counter-1'): Order {
  return { id, customerId: `guest-${id}`, state: 'waitingDelivery', progress: 6, dishId, counterId };
}

describe('тарелки и блюда на стойке выдачи', () => {
  it('возвращает пустой список для пустой стойки', () => {
    expect(counterPlateDishes(scene(), 'counter-1')).toEqual([]);
  });

  it('возвращает одно готовое не взятое блюдо', () => {
    const state = scene();
    state.orders.push(readyOrder('1', 'soup'));
    expect(counterPlateDishes(state, 'counter-1')).toEqual(['soup']);
  });

  it('сохраняет порядок трёх заказов из состояния', () => {
    const state = scene();
    state.orders.push(readyOrder('1', 'soup'), readyOrder('2', 'salad'), readyOrder('3', 'pasta'));
    expect(counterPlateDishes(state, 'counter-1')).toEqual(['soup', 'salad', 'pasta']);
  });

  it('не показывает блюдо, которое официант уже забрал', () => {
    const state = scene();
    state.orders.push({ ...readyOrder('1', 'soup'), pickedUp: true });
    expect(counterPlateDishes(state, 'counter-1')).toEqual([]);
  });

  it('не показывает блюдо с другой стойки', () => {
    const state = scene();
    state.orders.push(readyOrder('1', 'soup', 'counter-2'));
    expect(counterPlateDishes(state, 'counter-1')).toEqual([]);
  });

  it('не показывает заказ, который ещё не ожидает выдачи', () => {
    const state = scene();
    state.orders.push({ ...readyOrder('1', 'soup'), state: 'cooking' });
    expect(counterPlateDishes(state, 'counter-1')).toEqual([]);
  });

  it('ограничивает отображение тремя слотами даже при пяти заказах', () => {
    const state = scene();
    for (let index = 0; index < 5; index += 1) state.orders.push(readyOrder(`${index}`, 'soup'));
    expect(counterPlateDishes(state, 'counter-1')).toHaveLength(COUNTER_MAX_SLOTS);
  });

  it('каждое блюдо имеет непустой эмодзи длиной от 1 до 8', () => {
    for (const dish of DISHES) {
      expect(typeof dish.emoji, dish.id).toBe('string');
      expect(dish.emoji.length, dish.id).toBeGreaterThan(0);
      expect(dish.emoji.length, dish.id).toBeLessThanOrEqual(8);
    }
  });

  it('суп обозначен согласованным эмодзи', () => {
    expect(DISHES.find((dish) => dish.id === 'soup')?.emoji).toBe('🍲');
  });

  it('селектор не мутирует заказы и гостей', () => {
    const state = scene();
    state.orders.push(readyOrder('1', 'soup'));
    const orders = structuredClone(state.orders);
    const customers = structuredClone(state.customers);
    counterPlateDishes(state, 'counter-1');
    expect(state.orders).toEqual(orders);
    expect(state.customers).toEqual(customers);
  });
});
