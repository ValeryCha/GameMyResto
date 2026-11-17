import { DISHES } from '../content/dishes';
import { loyaltyItemById } from '../content/loyalty';
import { chooseGuestAction } from './ai';
import { findPath, isWalkable, samePoint } from './grid';
import { moveActor } from './movement';
import { nextRandom } from './random';
import { findSeat, isSeatCurrent } from './seating';
import { processProgression } from './progression';
import { createGuestOrder, settleOrder } from './orders';
import { createAppearance } from '../render3d/appearance';
import { arrivalRate, patienceMultiplier } from './guestFlow';
import { cookingProgress, waiterMovementSteps } from './staff';
import { beginPeak, finishPeak, recordPeakArrival, recordPeakSeated, recordPeakUnhappy } from './peak';
import { advanceQueuedGuest, enqueueGuest, seatQueuedGuest } from './queue';
import type { Customer, Employee, Furniture, GameState, Order, Point } from './types';

const DIRECTIONS: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

function adjacentCells(state: GameState, item: Furniture): Point[] {
  return DIRECTIONS.map((direction) => ({ x: item.position.x + direction.x, y: item.position.y + direction.y }))
    .filter((point) => isWalkable(state, point));
}

function occupiedCells(state: GameState, actor: { id?: string }): Point[] {
  return [...state.employees, ...state.customers]
    .filter((other) => other.id !== actor.id && !('state' in other && other.state === 'queueWaiting'))
    .map((other) => other.position);
}

function routeTo(state: GameState, actor: { id?: string; position: Point }, target: Point): Point[] {
  return samePoint(actor.position, target) ? [] : findPath(state, actor.position, target, occupiedCells(state, actor));
}

function nearestCell(state: GameState, actor: { id?: string; position: Point }, item: Furniture): Point | undefined {
  return adjacentCells(state, item)
    .map((point) => ({ point, path: routeTo(state, actor, point) }))
    .filter((candidate) => candidate.path.length > 0 || samePoint(actor.position, candidate.point))
    .sort((a, b) => a.path.length - b.path.length)[0]?.point;
}

function entrance(state: GameState): Point {
  const door = state.furniture.find((item) => item.kind === 'door');
  return door ? { ...door.position } : { x: 0, y: 0 };
}

function exitTarget(state: GameState, guest: Customer): Point {
  const door = state.furniture.find((item) => item.kind === 'door');
  return (door && nearestCell(state, guest, door)) || entrance(state);
}

function reserveSeat(state: GameState, guest: Customer): boolean {
  const assignment = findSeat(state, guest, (chair) =>
    samePoint(guest.position, chair.position) || findPath(state, guest.position, chair.position).length > 0);
  if (!assignment) return false;
  guest.seatId = assignment.chair.id;
  guest.target = { ...assignment.chair.position };
  guest.state = 'seekingSeat';
  recordPeakSeated(state);
  return true;
}

function clearEntrance(state: GameState, guest: Customer): boolean {
  const door = entrance(state);
  if (!samePoint(guest.position, door)) return false;
  const target = DIRECTIONS
    .map((direction) => ({ x: door.x + direction.x, y: door.y + direction.y }))
    .filter((point) => isWalkable(state, point) && !occupiedCells(state, guest).some((other) => samePoint(point, other)))
    .map((point) => ({ point, path: routeTo(state, guest, point) }))
    .filter((candidate) => candidate.path.length > 0)
    .sort((a, b) => a.path.length - b.path.length)[0]?.point;
  if (!target) return true;
  if (guest.state === 'queueWaiting') {
    guest.position = { ...target };
    guest.target = undefined;
    return true;
  }
  guest.state = 'entering';
  guest.target = target;
  if (moveActor(state, guest, target) === 'arrived') {
    guest.state = 'seekingSeat';
    guest.target = undefined;
  }
  return true;
}

function clearQueuedEntrance(state: GameState, guest: Customer): void {
  clearEntrance(state, guest);
  guest.state = 'queueWaiting';
  guest.target = undefined;
}

function placeInQueue(state: GameState, guest: Customer): void {
  if (!enqueueGuest(state, guest)) return;
  clearQueuedEntrance(state, guest);
}

function unhappyExit(state: GameState, guest: Customer): void {
  guest.state = 'leaving';
  guest.target = exitTarget(state, guest);
  guest.seatId = undefined;
  recordPeakUnhappy(state);
  if (guest.waitingForRecipe) return;
  state.popularity = Math.max(0, state.popularity - 10);
  state.unhappyTotal += 1;
  state.satisfiedStreak = 0;
}

export function patienceBonus(state: GameState): number {
  const owned = state.ownedLoyaltyItems ?? [];
  const legacyPlants = owned.includes('plant') ? 0 : state.furniture.filter((item) => item.kind === 'plant').length;
  const catalogBonus = owned.reduce((sum, id) => sum + (loyaltyItemById(id)?.bonus ?? 0), 0);
  return Math.min(1, Math.min(0.5, legacyPlants * 0.1) + catalogBonus / 100);
}

function spawnCustomer(state: GameState): boolean {
  const position = entrance(state);
  const blocksEntrance = (actor: Employee | Customer) =>
    samePoint(actor.position, position) && !('state' in actor && actor.state === 'queueWaiting');
  if ([...state.employees, ...state.customers].some(blocksEntrance)) return false;
  recordPeakArrival(state);
  const bonus = (1 + patienceBonus(state)) * patienceMultiplier(state);
  const guest: Customer = {
    id: `customer-${state.tick}`,
    position,
    state: 'seekingSeat',
    patience: 240 * bonus,
    foodWait: 120 * bonus,
    ...createAppearance(() => nextRandom(state)),
  };
  const earlierGuestNeedsSeat = state.customers.some((other) =>
    other.id !== guest.id && !other.seatId && !other.waitingForRecipe &&
    !['queueWaiting', 'leaving', 'seated', 'ordering', 'waitingFood', 'eating'].includes(other.state));
  state.customers.push(guest);
  if (earlierGuestNeedsSeat || !reserveSeat(state, guest)) placeInQueue(state, guest);
  return true;
}

function updateCustomer(state: GameState, guest: Customer): void {
  if (guest.state === 'leaving') {
    if (moveActor(state, guest, guest.target ?? entrance(state), 2, true) === 'arrived') {
      state.customers = state.customers.filter((item) => item.id !== guest.id);
      state.orders = state.orders.filter((order) => order.customerId !== guest.id);
    }
    return;
  }

  if (guest.state === 'queueWaiting') {
    clearQueuedEntrance(state, guest);
    if (!advanceQueuedGuest(state, guest, exitTarget(state, guest))) return;
    if (state.guestQueue[0] === guest.id && reserveSeat(state, guest)) seatQueuedGuest(state, guest);
    return;
  }

  if (guest.state === 'eating') {
    if (state.tick >= (guest.actionUntil ?? Infinity)) {
      const order = state.orders.find((item) => item.id === guest.orderId);
      if (order) settleOrder(state, guest, order);
      else guest.state = 'leaving';
      guest.target = exitTarget(state, guest);
      guest.seatId = undefined;
    }
    return;
  }

  if (guest.state === 'waitingFood') {
    guest.foodWait = (guest.foodWait ?? 120) - 1;
    const order = state.orders.find((item) => item.id === guest.orderId);
    if (order?.state === 'delivered') {
      guest.state = 'eating';
      guest.actionUntil = state.tick + 8;
    } else if (guest.foodWait <= 0) {
      unhappyExit(state, guest);
    }
    return;
  }

  if (guest.state === 'seated') {
    guest.state = 'ordering';
    return;
  }

  if (guest.state === 'ordering') {
    const action = chooseGuestAction(state, guest);
    if (action === 'order') {
      const order = createGuestOrder(state, guest);
      if (order) guest.foodWait = 120 * (1 + patienceBonus(state)) * patienceMultiplier(state);
      else if (!guest.waitingForRecipe) {
        guest.state = 'leaving';
        guest.target = exitTarget(state, guest);
        guest.seatId = undefined;
      }
    }
    return;
  }

  guest.patience = Math.max(0, guest.patience - 1);
  if (guest.seatId && !isSeatCurrent(state, guest)) {
    guest.seatId = undefined;
    guest.target = undefined;
    guest.state = 'seekingSeat';
  }
  if (guest.waitingForRecipe && guest.desiredDishId && state.unlockedDishIds.includes(guest.desiredDishId)) {
    guest.waitingForRecipe = false;
    guest.state = 'seekingSeat';
    guest.target = undefined;
    guest.actionUntil = undefined;
  }
  if (!guest.seatId && !guest.waitingForRecipe && reserveSeat(state, guest)) {
    guest.actionUntil = undefined;
  } else if (!guest.seatId && !guest.waitingForRecipe) {
    placeInQueue(state, guest);
    return;
  } else if (!guest.seatId && clearEntrance(state, guest)) {
    return;
  }
  const action = chooseGuestAction(state, guest);
  if (action === 'leave') {
    unhappyExit(state, guest);
    return;
  }

  if (guest.state === 'seekingSeat' && guest.target) {
    const movement = moveActor(state, guest, guest.target);
    if (movement === 'arrived') {
      guest.state = 'seated';
      guest.target = undefined;
    } else if (movement === 'blocked') {
      const occupied = occupiedCells(state, guest);
      const yieldTarget = DIRECTIONS
        .map((direction) => ({ x: guest.position.x + direction.x, y: guest.position.y + direction.y }))
        .find((point) => isWalkable(state, point) && !occupied.some((other) => samePoint(point, other)));
      if (yieldTarget) moveActor(state, guest, yieldTarget, 1);
    }
    return;
  }

  if (state.tick < (guest.actionUntil ?? 0)) return;
  if (guest.state === 'wandering' || guest.state === 'inspecting') {
    guest.state = 'seekingSeat';
    guest.target = undefined;
    return;
  }
  if (action === 'wander') {
    const candidates = DIRECTIONS.map((direction) => ({ x: guest.position.x + direction.x, y: guest.position.y + direction.y }))
      .filter((point) => isWalkable(state, point));
    if (candidates.length) guest.target = candidates[Math.floor(nextRandom(state) * candidates.length)];
    guest.state = 'wandering';
  } else {
    const furniture = state.furniture.filter((item) => item.kind !== 'door');
    if (furniture.length) {
      const item = furniture[Math.floor(nextRandom(state) * furniture.length)];
      guest.target = nearestCell(state, guest, item);
    }
    guest.state = 'inspecting';
  }
  guest.actionUntil = state.tick + 1 + Math.floor(nextRandom(state) * 2);
  if (guest.target) moveActor(state, guest, guest.target);
}

function orderFor(state: GameState, employee: Employee): Order | undefined {
  return state.orders.find((order) => order.id === employee.taskId);
}

function updateChef(state: GameState, chef: Employee): void {
  let order = orderFor(state, chef);
  if (!order || !['waitingCook', 'cooking'].includes(order.state)) {
    chef.taskId = undefined;
    order = state.orders.find((item) => item.state === 'waitingCook' &&
      !state.employees.some((employee) => employee.id !== chef.id && employee.taskId === item.id));
    if (!order) return;
    chef.taskId = order.id;
  }
  const stove = state.furniture.find((item) => item.kind === 'stove');
  if (!stove) return;
  const target = nearestCell(state, chef, stove);
  if (!target) return;
  if (moveActor(state, chef, target) !== 'arrived') return;
  if (order.state === 'waitingCook') order.state = 'cooking';
  order.progress += cookingProgress(state.upgrades.cooking);
  const dish = DISHES.find((item) => item.id === order!.dishId) ?? DISHES[0];
  if (order.progress >= dish.cookSeconds && state.furniture.some((item) => item.kind === 'counter')) {
    order.state = 'waitingDelivery';
    chef.taskId = undefined;
  }
}

function parkIdleWaiter(state: GameState, waiter: Employee): void {
  const kitchen = state.furniture.filter((item) => item.kind === 'stove' || item.kind === 'counter');
  const nearKitchen = kitchen.some((item) => Math.abs(item.position.x - waiter.position.x) + Math.abs(item.position.y - waiter.position.y) <= 2);
  if (!nearKitchen) return;
  const occupied = occupiedCells(state, waiter);
  const target = Array.from({ length: state.height }, (_, y) =>
    Array.from({ length: state.width }, (_, x) => ({ x, y }))).flat()
    .filter((point) => isWalkable(state, point) &&
      !state.furniture.some((item) => samePoint(item.position, point)) &&
      !occupied.some((other) => samePoint(point, other)) &&
      kitchen.every((item) => Math.abs(item.position.x - point.x) + Math.abs(item.position.y - point.y) > 2) &&
      Math.abs(entrance(state).x - point.x) + Math.abs(entrance(state).y - point.y) > 1)
    .map((point) => ({ point, path: routeTo(state, waiter, point) }))
    .filter((candidate) => candidate.path.length > 0)
    .sort((a, b) => a.path.length - b.path.length)[0]?.point;
  if (target) moveActor(state, waiter, target, waiterMovementSteps(waiter, state.upgrades.waiter));
}

function updateWaiter(state: GameState, waiter: Employee): void {
  let order = orderFor(state, waiter);
  let guest = order ? state.customers.find((item) => item.id === order!.customerId) : undefined;
  if (order?.state === 'waitingDelivery' && (!guest || guest.state === 'leaving')) {
    order.assignedTo = undefined;
    order.pickedUp = false;
    waiter.taskId = undefined;
    order = undefined;
  }
  if (!order || order.state === 'delivered') {
    waiter.taskId = undefined;
    order = state.orders.find((item) => item.state === 'waitingDelivery' &&
      state.customers.some((customer) => customer.id === item.customerId && customer.state !== 'leaving') &&
      !state.employees.some((employee) => employee.id !== waiter.id && employee.taskId === item.id));
    if (!order) {
      parkIdleWaiter(state, waiter);
      return;
    }
    waiter.taskId = order.id;
    order.assignedTo = waiter.id;
    guest = state.customers.find((item) => item.id === order!.customerId);
  }
  const counters = state.furniture.filter((item) => item.kind === 'counter');
  const waiterIndex = state.employees.filter((employee) => employee.role === 'waiter').findIndex((employee) => employee.id === waiter.id);
  const counter = counters[waiterIndex % counters.length];
  if (!counter || !guest) return;
  const pickup = nearestCell(state, waiter, counter);
  if (!pickup) return;
  const atCounter = Math.abs(waiter.position.x - counter.position.x) + Math.abs(waiter.position.y - counter.position.y) === 1;
  const steps = waiterMovementSteps(waiter, state.upgrades.waiter);
  if (!order.pickedUp) {
    if (!atCounter) {
      moveActor(state, waiter, pickup, steps);
      return;
    }
    order.pickedUp = true;
  }
  const chair = state.furniture.find((item) => item.id === guest.seatId);
  const target = chair
    ? adjacentCells(state, chair)
      .filter((point) => !samePoint(point, guest!.position))
      .map((point) => ({ point, path: routeTo(state, waiter, point) }))
      .filter((candidate) => candidate.path.length > 0 || samePoint(waiter.position, candidate.point))
      .sort((a, b) => a.path.length - b.path.length)[0]?.point
    : nearestCell(state, waiter, { id: guest.id, kind: 'plant', position: guest.position, rotation: 0 });
  if (target && moveActor(state, waiter, target, steps) === 'arrived') {
    order.state = 'delivered';
    waiter.taskId = undefined;
  }
}

export function advanceSimulation(state: GameState, steps = 1): void {
  for (let i = 0; i < steps; i += 1) {
    state.tick += 1;
    beginPeak(state);
    state.arrivalProgress += arrivalRate(state);
    if (state.tick === 1) {
      spawnCustomer(state);
      state.arrivalProgress -= 1;
    } else if (state.arrivalProgress >= 1) {
      spawnCustomer(state);
      state.arrivalProgress -= 1;
    }
    for (const employee of state.employees) employee.energy = Math.max(0, employee.energy - 0.002);
    for (const guest of [...state.customers]) updateCustomer(state, guest);
    const chef = state.employees.find((employee) => employee.role === 'chef');
    if (chef) updateChef(state, chef);
    for (const waiter of state.employees.filter((employee) => employee.role === 'waiter')) updateWaiter(state, waiter);
    finishPeak(state);
    processProgression(state);
  }
}
