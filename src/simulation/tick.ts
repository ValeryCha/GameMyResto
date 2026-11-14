import { DISHES } from '../content/dishes';
import { chooseGuestAction } from './ai';
import { isWalkable, samePoint } from './grid';
import { moveToward } from './movement';
import { nextRandom } from './random';
import type { Customer, Employee, Furniture, GameState, Order, Point } from './types';

const DIRECTIONS: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

function adjacentCells(state: GameState, item: Furniture): Point[] {
  return DIRECTIONS.map((direction) => ({ x: item.position.x + direction.x, y: item.position.y + direction.y }))
    .filter((point) => isWalkable(state, point));
}

function nearestCell(state: GameState, actor: { position: Point }, item: Furniture): Point | undefined {
  return adjacentCells(state, item).sort((a, b) =>
    Math.abs(a.x - actor.position.x) + Math.abs(a.y - actor.position.y) -
    Math.abs(b.x - actor.position.x) - Math.abs(b.y - actor.position.y))[0];
}

function entrance(state: GameState): Point {
  const door = state.furniture.find((item) => item.kind === 'door');
  return door ? { ...door.position } : { x: 0, y: 0 };
}

function exitTarget(state: GameState, guest: Customer): Point {
  const door = state.furniture.find((item) => item.kind === 'door');
  return (door && nearestCell(state, guest, door)) || entrance(state);
}

function freeSeat(state: GameState, guest: Customer): Furniture | undefined {
  return state.furniture.find((chair) => chair.kind === 'chair' &&
    state.furniture.some((table) => table.kind === 'table') &&
    !state.customers.some((other) => other.id !== guest.id && other.seatId === chair.id));
}

function reserveSeat(state: GameState, guest: Customer): boolean {
  const chair = state.furniture.find((item) => item.id === guest.seatId) ?? freeSeat(state, guest);
  if (!chair) return false;
  const target = nearestCell(state, guest, chair);
  if (!target) return false;
  guest.seatId = chair.id;
  guest.target = target;
  guest.state = 'seekingSeat';
  return true;
}

function unhappyExit(state: GameState, guest: Customer): void {
  guest.state = 'leaving';
  guest.target = exitTarget(state, guest);
  guest.seatId = undefined;
  state.popularity = Math.max(0, state.popularity - 1);
}

function spawnCustomer(state: GameState): void {
  const position = entrance(state);
  state.customers.push({
    id: `customer-${state.tick}`,
    position,
    state: 'seekingSeat',
    patience: 300,
    foodWait: 120,
  });
}

function updateCustomer(state: GameState, guest: Customer): void {
  if (guest.state === 'leaving') {
    if (moveToward(state, guest, guest.target ?? entrance(state)) === 'arrived') {
      state.customers = state.customers.filter((item) => item.id !== guest.id);
      state.orders = state.orders.filter((order) => order.customerId !== guest.id || order.state === 'delivered');
    }
    return;
  }

  if (guest.state === 'eating') {
    if (state.tick >= (guest.actionUntil ?? Infinity)) {
      const order = state.orders.find((item) => item.id === guest.orderId);
      const dish = DISHES.find((item) => item.id === order?.dishId) ?? DISHES[0];
      state.coins += dish.price;
      state.experience += 10;
      state.popularity = Math.min(50, state.popularity + 0.1);
      guest.state = 'leaving';
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

  if (guest.state === 'ordering') {
    const action = chooseGuestAction(state, guest);
    if (action === 'order') {
      const orderId = `order-${guest.id}`;
      const dish = DISHES[Math.floor(nextRandom(state) * DISHES.length)];
      guest.orderId = orderId;
      guest.state = 'waitingFood';
      guest.foodWait = 120;
      state.orders.push({ id: orderId, customerId: guest.id, state: 'waitingCook', progress: 0, dishId: dish.id });
    }
    return;
  }

  guest.patience = Math.max(0, guest.patience - 1);
  if (guest.state === 'seekingSeat' && !guest.seatId && guest.patience === 299 && !freeSeat(state, guest)) return;
  const action = chooseGuestAction(state, guest);
  if (action === 'leave') {
    unhappyExit(state, guest);
    return;
  }

  if (action === 'seat' && guest.state !== 'wandering' && guest.state !== 'inspecting') {
    if (!reserveSeat(state, guest)) return;
  }

  if (guest.state === 'seekingSeat' && guest.target) {
    const movement = moveToward(state, guest, guest.target);
    if (movement === 'arrived') {
      guest.state = 'ordering';
      guest.target = undefined;
    } else if (movement === 'blocked') {
      guest.seatId = undefined;
      guest.target = undefined;
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
  if (guest.target) moveToward(state, guest, guest.target);
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
  if (moveToward(state, chef, target) !== 'arrived') return;
  if (order.state === 'waitingCook') order.state = 'cooking';
  order.progress += 1;
  const dish = DISHES.find((item) => item.id === order!.dishId) ?? DISHES[0];
  if (order.progress >= dish.cookSeconds && state.furniture.some((item) => item.kind === 'counter')) {
    order.state = 'waitingDelivery';
    chef.taskId = undefined;
  }
}

function updateWaiter(state: GameState, waiter: Employee): void {
  let order = orderFor(state, waiter);
  if (!order || order.state === 'delivered') {
    waiter.taskId = undefined;
    order = state.orders.find((item) => item.state === 'waitingDelivery' &&
      !state.employees.some((employee) => employee.id !== waiter.id && employee.taskId === item.id));
    if (!order) return;
    waiter.taskId = order.id;
    order.assignedTo = waiter.id;
  }
  const counter = state.furniture.find((item) => item.kind === 'counter');
  const guest = state.customers.find((item) => item.id === order!.customerId);
  if (!counter || !guest || guest.state === 'leaving') return;
  const pickup = nearestCell(state, waiter, counter);
  if (!pickup) return;
  const atCounter = Math.abs(waiter.position.x - counter.position.x) + Math.abs(waiter.position.y - counter.position.y) === 1;
  if (!order.pickedUp) {
    if (!atCounter) {
      moveToward(state, waiter, pickup);
      return;
    }
    order.pickedUp = true;
  }
  const chair = state.furniture.find((item) => item.id === guest.seatId);
  const target = chair ? nearestCell(state, waiter, chair) : nearestCell(state, waiter, {
    id: guest.id, kind: 'plant', position: guest.position, rotation: 0,
  });
  if (target && moveToward(state, waiter, target) === 'arrived') {
    order.state = 'delivered';
    waiter.taskId = undefined;
  }
}

export function advanceSimulation(state: GameState, steps = 1): void {
  for (let i = 0; i < steps; i += 1) {
    state.tick += 1;
    if ((state.tick === 1 || state.tick % 30 === 1) && state.customers.length < state.guestLimit) spawnCustomer(state);
    for (const employee of state.employees) employee.energy = Math.max(0, employee.energy - 0.002);
    for (const guest of [...state.customers]) updateCustomer(state, guest);
    const chef = state.employees.find((employee) => employee.role === 'chef');
    const waiter = state.employees.find((employee) => employee.role === 'waiter');
    if (chef) updateChef(state, chef);
    if (waiter) updateWaiter(state, waiter);
  }
}
