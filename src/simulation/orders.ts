import { DISHES, type Dish } from '../content/dishes';
import { availableDishes } from './progression';
import { nextRandom } from './random';
import { tipMultiplier } from './guestFlow';
import { peakTipMultiplier, recordPeakService } from './peak';
import type { Customer, GameState, Order } from './types';

export interface DishSelection {
  dish: Dish;
  desired: boolean;
}

function weightedDesiredDish(state: GameState): Dish | undefined {
  const dishes = availableDishes(state);
  if (!dishes.length) return undefined;
  const rating = state.popularity / 1000;
  const weights = dishes.map((dish) => 1 + rating * (dish.unlockLevel - 1));
  let roll = nextRandom(state) * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < dishes.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return dishes[i];
  }
  return dishes[dishes.length - 1];
}

export function selectGuestDish(state: GameState, guest: Customer): DishSelection | undefined {
  guest.hasDesire ??= nextRandom(state) < 0.05;
  const dishes = availableDishes(state);
  if (!dishes.length) return undefined;
  if (guest.hasDesire) {
    const existing = DISHES.find((dish) => dish.id === guest.desiredDishId);
    const desired = existing ?? weightedDesiredDish(state)!;
    guest.desiredDishId = desired.id;
    return { dish: desired, desired: true };
  }
  return { dish: dishes[Math.floor(nextRandom(state) * dishes.length)], desired: false };
}

export function createGuestOrder(state: GameState, guest: Customer): Order | undefined {
  const selection = selectGuestDish(state, guest);
  if (!selection) return undefined;
  if (selection.desired && !state.unlockedDishIds.includes(selection.dish.id)) {
    guest.state = 'wandering';
    guest.waitingForRecipe = true;
    guest.patience = 240;
    guest.seatId = undefined;
    guest.target = undefined;
    guest.orderId = undefined;
    return undefined;
  }
  guest.waitingForRecipe = false;
  const order: Order = {
    id: `order-${guest.id}`,
    customerId: guest.id,
    state: 'waitingCook',
    progress: 0,
    dishId: selection.dish.id,
    desired: selection.desired,
  };
  guest.orderId = order.id;
  guest.state = 'waitingFood';
  state.orders.push(order);
  return order;
}

export const paymentFor = (state: GameState, dish: Dish, desired: boolean): number =>
  Math.round(dish.price * (desired ? 5 : 1) * tipMultiplier(state) * peakTipMultiplier(state));

export function settleOrder(state: GameState, guest: Customer, order: Order): number {
  const dish = DISHES.find((item) => item.id === order.dishId) ?? DISHES[0];
  const revenue = paymentFor(state, dish, Boolean(order.desired));
  state.coins += revenue;
  state.revenueTotal += revenue;
  recordPeakService(state, revenue);
  state.experience += 10;
  state.servedTotal += 1;
  state.satisfiedStreak += 1;
  if (order.desired) state.desiredServedTotal += 1;
  state.popularity = Math.min(1000, state.popularity + 1);
  guest.state = 'leaving';
  guest.seatId = undefined;
  return revenue;
}
