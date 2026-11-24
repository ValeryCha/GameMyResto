import { DISHES } from '../content/dishes';
import { loyaltyItemById } from '../content/loyalty';
import { chooseGuestAction } from './ai';
import { findPath, furnitureCells, isWalkable, samePoint } from './grid';
import { blocksMovement, moveActor } from './movement';
import { nextRandom } from './random';
import { findSeat, isSeatCurrent } from './seating';
import { processProgression } from './progression';
import { createGuestOrder, settleOrder } from './orders';
import { createAppearance } from '../render3d/appearance';
import { arrivalRate, patienceMultiplier } from './guestFlow';
import { cookingProgress, waiterCarryCapacity, waiterMovementSteps } from './staff';
import { counterForChef, counterForWaiter, ensureOrderCounter, serviceCounters } from './counterService';
import { counterDeliveryInterval, kitchenDistance, stoveBurners, stoveForChef, synchronizeChefStoves, withinChefRange } from './kitchen';
import { transitionOrder } from './orderDiagnostics';
import { beginPeak, finishPeak, recordPeakArrival, recordPeakSeated, recordPeakUnhappy } from './peak';
import { advanceQueuedGuest, enqueueGuest, seatQueuedGuest } from './queue';
import type { Customer, Employee, Furniture, GameState, Order, Point } from './types';

const DIRECTIONS: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

function adjacentCells(state: GameState, item: Furniture): Point[] {
  const unique = new Map<string, Point>();
  for (const cell of furnitureCells(item, state)) for (const direction of DIRECTIONS) {
    const point = { x: cell.x + direction.x, y: cell.y + direction.y };
    if (isWalkable(state, point)) unique.set(`${point.x},${point.y}`, point);
  }
  return [...unique.values()];
}

function occupiedCells(state: GameState, actor: { id?: string; role?: string }): Point[] {
  return [...state.customers, ...state.employees]
    .filter((other) => other.id !== actor.id && blocksMovement(actor, other))
    .map((other) => other.position);
}

function routeTo(state: GameState, actor: { id?: string; role?: string; position: Point }, target: Point): Point[] {
  return samePoint(actor.position, target) ? [] : findPath(state, actor.position, target, occupiedCells(state, actor));
}

function nearestCell(state: GameState, actor: { id?: string; role?: string; position: Point }, item: Furniture): Point | undefined {
  return adjacentCells(state, item)
    .map((point) => ({ point, path: routeTo(state, actor, point) }))
    .filter((candidate) => candidate.path.length > 0 || samePoint(actor.position, candidate.point))
    .sort((a, b) => a.path.length - b.path.length)[0]?.point;
}

function chefRouteTo(state: GameState, chef: Employee, target: Point, stove: Furniture): Point[] {
  if (!withinChefRange(state, target, stove)) return [];
  if (samePoint(chef.position, target)) return [];
  const outsideKitchen: Point[] = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const point = { x, y };
      // Повар перемещается только в рабочей зоне собственной плиты.
      if (!withinChefRange(state, point, stove)) outsideKitchen.push(point);
    }
  }
  return findPath(state, chef.position, target, [...occupiedCells(state, chef), ...outsideKitchen]);
}

function moveChef(state: GameState, chef: Employee, target: Point, stove: Furniture): 'arrived' | 'moving' | 'blocked' {
  if (samePoint(chef.position, target)) return 'arrived';
  const path = chefRouteTo(state, chef, target, stove);
  if (!path.length) return 'blocked';
  chef.position = { ...path[0] };
  return samePoint(chef.position, target) ? 'arrived' : 'moving';
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
  const atDoor = samePoint(guest.position, entrance(state));
  clearEntrance(state, guest);
  guest.state = 'queueWaiting';
  if (atDoor) guest.target = undefined;
}

function placeInQueue(state: GameState, guest: Customer): void {
  if (!enqueueGuest(state, guest)) return;
  clearQueuedEntrance(state, guest);
}

function cancelGuestOrder(state: GameState, guest: Customer): void {
  const order = state.orders.find((item) => item.customerId === guest.id);
  if (!order) return;
  const assignedEmployee = state.employees.find((employee) => employee.id === order.assignedTo);
  if (assignedEmployee) {
    assignedEmployee.orderIds = assignedEmployee.orderIds?.filter((id) => id !== order.id) ?? [];
    if (assignedEmployee.taskId === order.id) assignedEmployee.taskId = assignedEmployee.orderIds[0];
  }
  state.orders = state.orders.filter((item) => item.id !== order.id);
  guest.orderId = undefined;
}

function unhappyExit(state: GameState, guest: Customer): void {
  cancelGuestOrder(state, guest);
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

function wanderQueuedGuest(state: GameState, guest: Customer): void {
  if (state.tick < (guest.actionUntil ?? 0)) return;
  if (guest.target) {
    const movement = moveActor(state, guest, guest.target, 1);
    if (movement === 'moving') return;
    guest.target = undefined;
    guest.actionUntil = state.tick + 2;
    return;
  }
  const door = entrance(state);
  const occupied = occupiedCells(state, guest);
  // Небольшой детерминированный выбор клетки: очередь гуляет по залу, не толпится у двери.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const point = { x: Math.floor(nextRandom(state) * state.width), y: Math.floor(nextRandom(state) * state.height) };
    if (kitchenDistance(point, door) <= 2 || samePoint(point, guest.position) || !isWalkable(state, point) ||
      occupied.some((other) => samePoint(point, other)) || !routeTo(state, guest, point).length) continue;
    guest.target = point;
    moveActor(state, guest, point, 1);
    return;
  }
  guest.actionUntil = state.tick + 2;
}

function updateCustomer(state: GameState, guest: Customer): void {
  if (guest.state === 'leaving') {
    // Уход отменяет выдачу сразу, даже если дорога к двери временно занята.
    cancelGuestOrder(state, guest);
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
    else wanderQueuedGuest(state, guest);
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

function updateKitchenOrders(state: GameState): void {
  const chefs = state.employees.filter((employee) => employee.role === 'chef');
  const capacity = stoveBurners(state);
  const cookingAt = (order: Order, chef: Employee, stoveId: string) =>
    ['waitingCook', 'cooking'].includes(order.state) && order.stoveId === stoveId &&
    (!order.chefId || order.chefId === chef.id);
  // Восстанавливаем массив после старого сейва и отбрасываем отменённые/чужие заказы.
  for (const chef of chefs) {
    const stove = stoveForChef(state, chef);
    if (!stove) { chef.activeOrders = []; chef.taskId = undefined; continue; }
    const active = [...new Set(chef.activeOrders ?? [])].filter((id) => {
      const order = state.orders.find((item) => item.id === id);
      return order && cookingAt(order, chef, stove.id);
    }).slice(0, capacity);
    for (const order of state.orders) {
      if (active.length >= capacity) break;
      if (!active.includes(order.id) && cookingAt(order, chef, stove.id)) active.push(order.id);
    }
    chef.activeOrders = active;
    for (const id of active) {
      const order = state.orders.find((item) => item.id === id)!;
      order.chefId = chef.id;
      order.stoveId = stove.id;
    }
  }
  // Свободные конфорки заполняются только заказами без плиты; связка повар–плита не нарушается.
  for (const queued of state.orders.filter((item) => item.state === 'waitingCook' && !item.stoveId)) {
    const chef = chefs.find((employee) => stoveForChef(state, employee) && (employee.activeOrders?.length ?? 0) < capacity);
    const stove = chef && stoveForChef(state, chef);
    if (!chef || !stove) break;
    queued.stoveId = stove.id;
    queued.chefId = chef.id;
    chef.activeOrders!.push(queued.id);
  }
}

function updateChef(state: GameState, chef: Employee, allowExtraDelivery = true): void {
  const stove = stoveForChef(state, chef);
  if (!stove) { chef.activeOrders = []; chef.taskId = undefined; return; }
  const activeOrders = (chef.activeOrders ?? []).map((id) => state.orders.find((order) => order.id === id))
    .filter((order): order is Order => Boolean(order && order.stoveId === stove.id &&
      ['waitingCook', 'cooking'].includes(order.state)));
  chef.activeOrders = activeOrders.map((order) => order.id);
  // Каждая занятая конфорка прогрессирует независимо; taskId зарезервирован для выдачи.
  for (const order of activeOrders) {
    const dish = DISHES.find((item) => item.id === order.dishId) ?? DISHES[0];
    if (order.progress >= dish.cookSeconds) continue;
    transitionOrder(order, 'cooking', state.tick);
    order.progress = Math.min(dish.cookSeconds, order.progress + cookingProgress(state.upgrades.cooking));
    order.deliveryProgress ??= 0;
  }
  const stoveFree = () => (chef.activeOrders?.length ?? 0) < stoveBurners(state);
  const cooked = (order: Order) => {
    const dish = DISHES.find((item) => item.id === order.dishId) ?? DISHES[0];
    return chef.activeOrders!.includes(order.id) && order.state === 'cooking' && order.progress >= dish.cookSeconds;
  };
  let deliveryCredit = allowExtraDelivery ? 1 / counterDeliveryInterval(state) : Math.min(1, 1 / counterDeliveryInterval(state));
  while (deliveryCredit > 0) {
    const current = orderFor(state, chef);
    const order = current && cooked(current) ? current : activeOrders.find((candidate) => cooked(candidate) &&
      !state.employees.some((other) => other.id !== chef.id && other.role === 'chef' && other.taskId === candidate.id));
    if (!order) break;
    chef.taskId = order.id;
    const counter = counterForChef(state, chef);
    if (!counter) { chef.taskId = undefined; return; }
    const nearby = kitchenDistance(chef.position, counter.position) === 1 && withinChefRange(state, chef.position, stove);
    const target = adjacentCells(state, counter)
      .filter((point) => withinChefRange(state, point, stove))
      .map((point) => ({ point, path: chefRouteTo(state, chef, point, stove) }))
      .filter((candidate) => candidate.path.length > 0 || samePoint(chef.position, candidate.point))
      .sort((a, b) => a.path.length - b.path.length)[0]?.point;
    if (!nearby) {
      const movement = target ? moveChef(state, chef, target, stove) : 'blocked';
      if (movement === 'blocked') chef.taskId = undefined;
      if (movement !== 'arrived') return;
    }
    order.deliveryProgress = (order.deliveryProgress ?? 0) + deliveryCredit;
    if (order.deliveryProgress < 1) return;
    deliveryCredit = order.deliveryProgress - 1;
    transitionOrder(order, 'waitingDelivery', state.tick);
    order.counterId = counter.id;
    order.deliveryProgress = 0;
    chef.activeOrders = chef.activeOrders!.filter((id) => id !== order.id);
    chef.taskId = undefined;
  }

  const handoff = state.orders.find((item) => item.state === 'takingOrder' && item.chefId === chef.id && item.assignedTo);
  const waiter = handoff ? state.employees.find((employee) => employee.id === handoff.assignedTo) : undefined;
  if (handoff && waiter) {
    if (!stoveFree() || !withinChefRange(state, waiter.position, stove)) return;
    const nearby = kitchenDistance(chef.position, waiter.position) === 1 && withinChefRange(state, chef.position, stove);
    const meetingPoint = adjacentCells(state, { id: waiter.id, kind: 'plant', position: waiter.position, rotation: 0 })
      .filter((point) => withinChefRange(state, point, stove))
      .map((point) => ({ point, path: chefRouteTo(state, chef, point, stove) }))
      .filter((candidate) => candidate.path.length > 0 || samePoint(chef.position, candidate.point))
      .sort((a, b) => a.path.length - b.path.length)[0]?.point;
    if (nearby || (meetingPoint && moveChef(state, chef, meetingPoint, stove) === 'arrived')) {
      transitionOrder(handoff, 'waitingCook', state.tick);
      handoff.stoveId = stove.id;
      handoff.chefId = chef.id;
      handoff.assignedTo = undefined;
      waiter.taskId = undefined;
      chef.activeOrders!.push(handoff.id);
    }
    return;
  }

  if (chef.activeOrders.length) {
    const target = adjacentCells(state, stove)
      .map((point) => ({ point, path: chefRouteTo(state, chef, point, stove) }))
      .filter((candidate) => candidate.path.length > 0 || samePoint(chef.position, candidate.point))
      .sort((a, b) => a.path.length - b.path.length)[0]?.point;
    if (target) moveChef(state, chef, target, stove);
    return;
  }
  chef.taskId = undefined;
}

function parkIdleWaiter(state: GameState, waiter: Employee): void {
  const counters = serviceCounters(state);
  const waiters = state.employees.filter((employee) => employee.role === 'waiter');
  const kitchen = state.furniture.filter((item) => item.kind === 'stove' || item.kind === 'counter');
  if (counters.length >= waiters.length && counters.length) {
    const counter = counterForWaiter(state, waiter)!;
    if (Math.abs(waiter.position.x - counter.position.x) + Math.abs(waiter.position.y - counter.position.y) === 1) return;
    const target = nearestCell(state, waiter, counter);
    // При отдельной стойке официант ждёт рядом с ней, а не разбредается по залу.
    if (target) moveActor(state, waiter, target, waiterMovementSteps(waiter, state.upgrades.waiter));
    return;
  }
  // При дефиците стоек оставляем проходы кухни свободными для повара и активных заказов.
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
  const guestFor = (candidate: Order) => state.customers.find((item) => item.id === candidate.customerId);
  const validCarried = (candidate: Order | undefined): boolean => Boolean(candidate &&
    candidate.state === 'waitingDelivery' && candidate.pickedUp && candidate.assignedTo === waiter.id &&
    guestFor(candidate) && guestFor(candidate)!.state !== 'leaving');
  for (const id of waiter.orderIds ?? []) {
    const carried = state.orders.find((item) => item.id === id);
    if (!validCarried(carried) && carried) { carried.assignedTo = undefined; carried.pickedUp = false; }
  }
  waiter.orderIds = (waiter.orderIds ?? []).filter((id) => validCarried(state.orders.find((item) => item.id === id)));
  // Восстанавливаем очередь старого сейва, где были только отметки на заказах.
  for (const carried of state.orders.filter(validCarried)) {
    if (!waiter.orderIds.includes(carried.id)) waiter.orderIds.push(carried.id);
  }
  if (waiter.orderIds.length) waiter.taskId = waiter.orderIds[0];

  let order = orderFor(state, waiter);
  let guest = order ? guestFor(order) : undefined;
  if (order && order.state !== 'delivered' && (!guest || guest.state === 'leaving')) {
    order.assignedTo = undefined;
    order.pickedUp = false;
    waiter.orderIds = waiter.orderIds.filter((id) => id !== order!.id);
    waiter.taskId = waiter.orderIds[0];
    order = undefined;
  }
  if (!order || order.state === 'delivered') {
    waiter.taskId = undefined;
    const homeCounter = counterForWaiter(state, waiter);
    const available = state.orders.filter((item) => ['waitingWaiter', 'waitingDelivery'].includes(item.state) &&
      state.customers.some((customer) => customer.id === item.customerId && customer.state !== 'leaving') &&
      !state.employees.some((employee) => employee.id !== waiter.id &&
        (employee.taskId === item.id || employee.orderIds?.includes(item.id))));
    // Своя стойка имеет приоритет, но любой свободный официант может помочь остальным.
    order = available.find((item) => item.state === 'waitingDelivery' && item.counterId === homeCounter?.id) ??
      available.find((item) => item.state === 'waitingWaiter') ?? available[0];
    if (!order) {
      parkIdleWaiter(state, waiter);
      return;
    }
    waiter.taskId = order.id;
    order.assignedTo = waiter.id;
    guest = guestFor(order);
  }
  if (!order || !guest) return;
  const steps = waiterMovementSteps(waiter, state.upgrades.waiter);
  const guestTarget = () => {
    const chair = state.furniture.find((item) => item.id === guest!.seatId);
    return chair
      ? adjacentCells(state, chair)
        .filter((point) => !samePoint(point, guest!.position))
        .map((point) => ({ point, path: routeTo(state, waiter, point) }))
        .filter((candidate) => candidate.path.length > 0 || samePoint(waiter.position, candidate.point))
        .sort((a, b) => a.path.length - b.path.length)[0]?.point
      : nearestCell(state, waiter, { id: guest!.id, kind: 'plant', position: guest!.position, rotation: 0 });
  };

  if (order.state === 'waitingWaiter') {
    const target = guestTarget();
    if (target && moveActor(state, waiter, target, steps) === 'arrived') {
      transitionOrder(order, 'takingOrder', state.tick);
    }
    return;
  }

  if (order.state === 'takingOrder') {
    const activeOrder = order;
    let chef = state.employees.find((employee) => employee.id === activeOrder.chefId && employee.role === 'chef');
    if (!chef) {
      chef = state.employees.find((employee) => {
        const stove = stoveForChef(state, employee);
        return stove && (employee.activeOrders?.length ?? 0) < stoveBurners(state);
      });
      activeOrder.chefId = chef?.id;
    }
    const stove = chef ? stoveForChef(state, chef) : undefined;
    if (!chef || !stove) return;
    const atChef = kitchenDistance(waiter.position, chef.position) === 1;
    const target = adjacentCells(state, { id: chef.id, kind: 'plant', position: chef.position, rotation: 0 })
      .filter((point) => withinChefRange(state, point, stove))
      .map((point) => ({ point, path: routeTo(state, waiter, point) }))
      .filter((candidate) => candidate.path.length > 0 || samePoint(waiter.position, candidate.point))
      .sort((a, b) => a.path.length - b.path.length)[0]?.point;
    const movement = target ? moveActor(state, waiter, target, steps) : 'blocked';
    if ((!atChef || !withinChefRange(state, waiter.position, stove)) && movement === 'blocked') {
      // Неподвижный сотрудник не должен навсегда закрывать единственный коридор к повару.
      const occupied = occupiedCells(state, waiter);
      const detour = DIRECTIONS
        .map((direction) => ({ x: waiter.position.x + direction.x, y: waiter.position.y + direction.y }))
        .filter((point) => isWalkable(state, point) && !occupied.some((other) => samePoint(point, other)))
        .sort((a, b) => kitchenDistance(a, chef.position) - kitchenDistance(b, chef.position))[0];
      if (detour) moveActor(state, waiter, detour, 1);
    }
    return;
  }

  if (!order.pickedUp) {
    const counter = ensureOrderCounter(state, order);
    if (!counter) return;
    const pickup = nearestCell(state, waiter, counter);
    if (!pickup) return;
    const atCounter = Math.abs(waiter.position.x - counter.position.x) + Math.abs(waiter.position.y - counter.position.y) === 1;
    if (!atCounter) {
      moveActor(state, waiter, pickup, steps);
      return;
    }
    const distanceToGuest = (candidate: Order) => {
      const targetGuest = guestFor(candidate)!;
      return Math.abs(targetGuest.position.x - waiter.position.x) + Math.abs(targetGuest.position.y - waiter.position.y);
    };
    const carried = state.orders
      .filter((item) => item.state === 'waitingDelivery' && !item.pickedUp && item.counterId === counter.id &&
        (!item.assignedTo || item.assignedTo === waiter.id) &&
        !state.employees.some((employee) => employee.id !== waiter.id &&
          (employee.taskId === item.id || employee.orderIds?.includes(item.id))))
      .sort((a, b) => distanceToGuest(a) - distanceToGuest(b))
      .slice(0, waiterCarryCapacity(state.upgrades.waiter));
    for (const item of carried) { item.pickedUp = true; item.assignedTo = waiter.id; }
    waiter.orderIds = carried.map((item) => item.id);
    order = carried[0];
    waiter.taskId = order.id;
    guest = guestFor(order)!;
  }
  // После взятия блюда стойка больше не участвует в маршруте.
  const target = guestTarget();
  if (target && moveActor(state, waiter, target, steps) === 'arrived') {
    transitionOrder(order, 'delivered', state.tick);
    waiter.orderIds = waiter.orderIds.filter((id) => id !== order.id);
    waiter.taskId = waiter.orderIds[0];
  }
}

export function advanceSimulation(state: GameState, steps = 1): void {
  // Редактор ставит на паузу весь мир: гости, заказы, очередь, таймеры и персонал.
  if (state.editorMode) return;
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
    // Готовка общая для кухни, а перемещение и выдача — независимы для каждого повара.
    synchronizeChefStoves(state);
    updateKitchenOrders(state);
    const chefs = state.employees.filter((employee) => employee.role === 'chef');
    chefs.forEach((chef, index) => updateChef(state, chef, index === chefs.length - 1));
    for (const waiter of state.employees.filter((employee) => employee.role === 'waiter')) updateWaiter(state, waiter);
    finishPeak(state);
    processProgression(state);
    (state.ratingHistory ??= []).push({ tick: state.tick, value: state.popularity });
    state.ratingHistory = state.ratingHistory.filter((point) => point.tick >= state.tick - 60);
  }
}
