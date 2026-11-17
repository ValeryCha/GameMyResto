import { isWalkable } from './grid';
import type { CommandResult, GameState } from './types';
import { DISHES, recipeCost } from '../content/dishes';
import { claimCalendarReward } from './calendar';
import { expandBounds } from './expansion';
import { guestSlotPrice, MAX_PURCHASED_SLOTS, recalculateGuestLimit } from './guestLimits';
import { MAX_UPGRADE_LEVEL, MAX_WAITERS, UPGRADE_LEVELS, upgradePrice, waiterHirePrice, type StaffUpgradeKind } from './staff';

function spend(state: GameState, price: number, rating: number): boolean {
  if (state.coins < price) return false;
  state.coins -= price;
  state.popularity = Math.min(1000, state.popularity + rating);
  return true;
}

export function addTestFunds(state: GameState): void {
  state.coins += 50000;
}

const insufficient = { ok: false as const, reason: 'Недостаточно монет' };

export { UPGRADE_LEVELS } from './staff';

function buyUpgrade(state: GameState, kind: StaffUpgradeKind): CommandResult {
  const level = state.upgrades[kind];
  if (level >= MAX_UPGRADE_LEVEL) return { ok: false, reason: 'Улучшение уже максимальное' };
  if (state.level < UPGRADE_LEVELS[kind]) return { ok: false, reason: `Нужен ${UPGRADE_LEVELS[kind]} уровень` };
  if (!spend(state, upgradePrice(kind, level), 0)) return insufficient;
  state.upgrades[kind] += 1;
  return { ok: true };
}

export function buyCookingUpgrade(state: GameState): CommandResult {
  return buyUpgrade(state, 'cooking');
}

export function buyWaiterUpgrade(state: GameState): CommandResult {
  return buyUpgrade(state, 'waiter');
}

export function claimDailyReward(state: GameState, date: string): CommandResult {
  return claimCalendarReward(state, date);
}

export function hireWaiter(state: GameState): CommandResult {
  const count = state.employees.filter((employee) => employee.role === 'waiter').length;
  if (count >= MAX_WAITERS) return { ok: false, reason: 'Все официанты наняты' };
  const position = Array.from({ length: state.height }, (_, y) =>
    Array.from({ length: state.width }, (_, x) => ({ x, y }))).flat()
    .filter((point) => isWalkable(state, point) &&
      ![...state.employees, ...state.customers].some((actor) => actor.position.x === point.x && actor.position.y === point.y))
    .sort((a, b) => Math.abs(a.x - 2) + Math.abs(a.y - 2) - Math.abs(b.x - 2) - Math.abs(b.y - 2))[0];
  if (!position) return { ok: false, reason: 'Нет свободной клетки для официанта' };
  if (!spend(state, waiterHirePrice(count), 100)) return insufficient;
  const id = `waiter-${state.tick}-${state.employees.length}`;
  state.employees.push({ id, role: 'waiter', position, energy: 100, movementCredit: 0 });
  return { ok: true };
}

export function increaseGuestLimit(state: GameState): CommandResult {
  if (state.purchasedGuestSlots >= MAX_PURCHASED_SLOTS) return { ok: false, reason: 'Все дополнительные слоты куплены' };
  if (!spend(state, guestSlotPrice(state.purchasedGuestSlots), 30)) return insufficient;
  state.purchasedGuestSlots += 1;
  recalculateGuestLimit(state);
  return { ok: true };
}

export function expandRestaurant(state: GameState): CommandResult {
  if (!spend(state, 50000, 150)) return insufficient;
  expandBounds(state);
  state.paidExpansions += 1;
  return { ok: true };
}

export function buyRecipe(state: GameState, dishId: string): CommandResult {
  const dish = DISHES.find((item) => item.id === dishId);
  if (!dish) return { ok: false, reason: 'Рецепт не найден' };
  if (state.level < dish.unlockLevel) return { ok: false, reason: `Нужен ${dish.unlockLevel} уровень` };
  if (state.unlockedDishIds.includes(dish.id)) return { ok: false, reason: 'Рецепт уже куплен' };
  if (!spend(state, recipeCost(dish.unlockLevel), 0)) return insufficient;
  state.unlockedDishIds.push(dish.id);
  return { ok: true };
}
