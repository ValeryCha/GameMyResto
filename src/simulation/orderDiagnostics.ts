import { DISHES } from '../content/dishes';
import { distanceToStove } from './kitchen';
import type { GameState, Order } from './types';

export const ORDER_DELAY_TICKS = 30;

export function transitionOrder(order: Order, next: Order['state'], tick: number): void {
  if (order.state === next) return;
  order.state = next;
  order.stateChangedAt = tick;
}

export function orderStateAge(state: GameState, order: Order): number {
  return Math.max(0, state.tick - (order.stateChangedAt ?? state.tick));
}

export function orderWaitReason(state: GameState, order: Order): string {
  const chefs = state.employees.filter((employee) => employee.role === 'chef');
  const waiters = state.employees.filter((employee) => employee.role === 'waiter');
  const stoves = state.furniture.filter((item) => item.kind === 'stove');
  const counters = state.furniture.filter((item) => item.kind === 'counter');
  if (order.state === 'waitingWaiter') return waiters.length ? 'Официант назначается или идёт к гостю' : 'Нет официанта';
  if (order.state === 'takingOrder') {
    if (!chefs.length) return 'Нет повара';
    if (!stoves.some((stove) => !state.orders.some((other) => ['waitingCook', 'cooking'].includes(other.state) && other.stoveId === stove.id))) return 'Все плиты заняты';
    return 'Официант передаёт заказ повару';
  }
  if (order.state === 'waitingCook') return order.stoveId ? 'Заказ ожидает обработки на плите' : 'Ожидает свободную плиту';
  if (order.state === 'cooking') {
    const dish = DISHES.find((item) => item.id === order.dishId) ?? DISHES[0];
    if (order.progress < dish.cookSeconds) return 'Блюдо ещё готовится';
    if (!counters.length) return 'Нет стойки для готового блюда';
    return 'Повар идёт к стойке с готовым блюдом';
  }
  if (order.state === 'waitingDelivery') {
    if (!counters.some((counter) => counter.id === order.counterId)) return 'Стойка удалена или недоступна';
    return order.pickedUp ? 'Официант несёт блюдо гостю' : 'Официант идёт к стойке за блюдом';
  }
  return 'Заказ подан, гость ест';
}

export function kitchenLayoutWarnings(state: GameState): string[] {
  const stoves = state.furniture.filter((item) => item.kind === 'stove');
  const counters = state.furniture.filter((item) => item.kind === 'counter');
  const warnings: string[] = [];
  if (!stoves.length) warnings.push('Кухня: не размещена плита');
  if (!counters.length) warnings.push('Выдача: не размещена стойка');
  for (const chef of state.employees.filter((employee) => employee.role === 'chef' && !employee.stoveId)) {
    warnings.push(`${chef.id}: нет собственной плиты, повар ожидает`);
  }
  for (const stove of stoves) {
    if (counters.length && !counters.some((counter) => distanceToStove(state, counter.position, stove) <= 3)) {
      warnings.push(`Плита ${stove.id}: все стойки вне рабочей зоны повара`);
    }
  }
  return warnings;
}

export function delayedOrders(state: GameState) {
  return state.orders
    .filter((order) => order.state !== 'delivered' && orderStateAge(state, order) >= ORDER_DELAY_TICKS)
    .map((order) => ({
      id: order.id,
      state: order.state,
      age: orderStateAge(state, order),
      reason: orderWaitReason(state, order),
    }))
    .sort((a, b) => b.age - a.age);
}
