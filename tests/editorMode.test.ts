import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { setEditorMode } from '../src/simulation/editorMode';
import { moveFurniture } from '../src/simulation/commands';
import { advanceSimulation } from '../src/simulation/tick';
import { isWalkable } from '../src/simulation/grid';
import { LocalStorageAdapter } from '../src/persistence/localStorageAdapter';
import type { Customer, GameState, Order } from '../src/simulation/types';

function seatedGuest(id = 'guest-1', chairId = 'chair-1'): Customer {
  return { id, position: { x: 5, y: 5 }, state: 'waitingFood', patience: 200, foodWait: 100, seatId: chairId, orderId: `order-${id}` };
}

function addActiveOrder(state: GameState, orderState: Order['state']): Order {
  const guest = seatedGuest();
  const order: Order = {
    id: 'order-guest-1', customerId: guest.id, state: orderState, progress: 1, dishId: 'soup',
    chefId: 'chef-1', stoveId: 'stove-1', assignedTo: orderState === 'cooking' ? undefined : 'waiter-1',
    pickedUp: orderState === 'waitingDelivery', counterId: orderState === 'waitingDelivery' ? 'counter-1' : undefined,
  };
  guest.orderId = order.id;
  state.customers.push(guest);
  state.orders.push(order);
  state.employees.push({ id: 'waiter-1', role: 'waiter', position: { x: 5, y: 6 }, energy: 100, taskId: orderState === 'cooking' ? undefined : order.id });
  if (orderState === 'cooking') state.employees.find((employee) => employee.id === 'chef-1')!.taskId = order.id;
  if (orderState === 'waitingDelivery') state.furniture.push({ id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 });
  return order;
}

describe('глобальный режим редактора', () => {
  it('сохраняет сидящих гостей, их места и отсутствие дублей после перемещения', () => {
    const state = createGame();
    state.furniture.push(
      { id: 'table-2', kind: 'table', position: { x: 6, y: 4 }, rotation: 0 },
      { id: 'chair-2', kind: 'chair', position: { x: 6, y: 5 }, rotation: 0 },
      { id: 'plant-1', kind: 'plant', position: { x: 2, y: 6 }, rotation: 0 },
    );
    state.customers.push(seatedGuest('guest-1'), { ...seatedGuest('guest-2', 'chair-2'), position: { x: 6, y: 5 } });
    const before = structuredClone(state.customers);
    setEditorMode(state, true);
    advanceSimulation(state, 20);
    expect(state.tick).toBe(0);
    expect(moveFurniture(state, 'plant-1', { x: 2, y: 5 }).ok).toBe(true);
    expect(setEditorMode(state, false)).toEqual([]);
    expect(state.customers).toEqual(before);
    expect(new Set(state.customers.map((guest) => guest.id)).size).toBe(2);
  });

  it('сохраняет очередь, блуждание, координаты, пути и таймеры', () => {
    const state = createGame();
    state.customers.push(
      { id: 'queued', position: { x: 1, y: 7 }, state: 'queueWaiting', patience: 150, target: { x: 2, y: 6 }, queueEnteredAt: 4, queueWaitedTicks: 8, queuePatience: 90 },
      { id: 'wandering', position: { x: 3, y: 6 }, state: 'wandering', patience: 170, target: { x: 3, y: 5 }, actionUntil: 19 },
    );
    state.guestQueue = ['queued'];
    const before = structuredClone(state.customers);
    const queueBefore = [...state.guestQueue];
    setEditorMode(state, true);
    advanceSimulation(state, 10);
    setEditorMode(state, false);
    expect(state.customers).toEqual(before);
    expect(state.guestQueue).toEqual(queueBefore);
  });

  it.each(['takingOrder', 'cooking', 'waitingDelivery'] as const)('не разрывает активный заказ: %s', (orderState) => {
    const state = createGame();
    addActiveOrder(state, orderState);
    const guestsBefore = structuredClone(state.customers);
    const ordersBefore = structuredClone(state.orders);
    const staffBefore = structuredClone(state.employees);
    setEditorMode(state, true);
    advanceSimulation(state, 15);
    expect(state.orders).toEqual(ordersBefore);
    expect(state.employees).toEqual(staffBefore);
    setEditorMode(state, false);
    expect(state.customers).toEqual(guestsBefore);
    expect(state.orders).toEqual(ordersBefore);
    expect(state.employees).toEqual(staffBefore);
    // Официанту нужно время дойти до повара; новые гости при этом могут появляться по обычным правилам.
    advanceSimulation(state, 20);
    expect(state.orders).not.toEqual(ordersBefore);
    expect(state.customers.some((guest) => guest.id === 'guest-1') || state.servedTotal > 0).toBe(true);
  });

  it('переносит гостя на ближайшую свободную клетку, если на прежней появился предмет', () => {
    const state = createGame();
    state.customers.push({ id: 'guest', position: { x: 3, y: 3 }, state: 'wandering', patience: 200, actionUntil: 12 });
    setEditorMode(state, true);
    expect(moveFurniture(state, 'table-1', { x: 3, y: 3 }).ok).toBe(true);
    expect(setEditorMode(state, false)).toEqual(['guest']);
    expect(state.customers).toHaveLength(1);
    expect(state.customers[0].id).toBe('guest');
    expect(state.customers[0].position).not.toEqual({ x: 3, y: 3 });
    expect(isWalkable(state, state.customers[0].position)).toBe(true);
    expect(state.customers[0].state).toBe('wandering');
    expect(state.customers[0].actionUntil).toBe(12);
  });

  it('оставляет гостя на том же стуле, если стул перемещён вместе с местом', () => {
    const state = createGame();
    const guest = seatedGuest();
    state.customers.push(guest);
    state.orders.push({ id: 'order-guest-1', customerId: guest.id, state: 'cooking', progress: 2, dishId: 'soup', stoveId: 'stove-1' });
    setEditorMode(state, true);
    expect(moveFurniture(state, 'chair-1', { x: 5, y: 3 }).ok).toBe(true);
    setEditorMode(state, false);
    expect(guest.position).toEqual({ x: 5, y: 3 });
    expect(guest.seatId).toBe('chair-1');
    expect(guest.state).toBe('waitingFood');
    expect(guest.orderId).toBe('order-guest-1');
  });

  it('выдерживает многократный вход и выход без накопления гостей и изменения состояния', () => {
    const state = createGame();
    state.customers.push({ id: 'guest', position: { x: 3, y: 3 }, state: 'wandering', patience: 200, target: { x: 4, y: 3 }, actionUntil: 9 });
    const before = structuredClone(state.customers);
    for (let cycle = 0; cycle < 6; cycle += 1) {
      setEditorMode(state, true);
      advanceSimulation(state, 5);
      setEditorMode(state, false);
    }
    expect(state.tick).toBe(0);
    expect(state.customers).toEqual(before);
  });

  it('разрешает двигать все виды предметов только в редакторе', () => {
    const state = createGame();
    addActiveOrder(state, 'cooking');
    state.furniture.push(
      { id: 'counter-1', kind: 'counter', position: { x: 1, y: 2 }, rotation: 0 },
      { id: 'plant-1', kind: 'plant', position: { x: 2, y: 6 }, rotation: 0 },
      { id: 'double-1', kind: 'tableDouble', position: { x: 6, y: 1 }, rotation: 0 },
    );
    expect(moveFurniture(state, 'stove-1', { x: 2, y: 1 }).ok).toBe(false);
    expect(moveFurniture(state, 'chair-1', { x: 5, y: 3 }).ok).toBe(false);
    setEditorMode(state, true);
    for (const [id, position] of [
      ['stove-1', { x: 2, y: 1 }], ['counter-1', { x: 2, y: 2 }], ['chair-1', { x: 5, y: 3 }],
      ['table-1', { x: 6, y: 5 }], ['plant-1', { x: 6, y: 6 }], ['double-1', { x: 3, y: 0 }], ['door-1', { x: 0, y: 6 }],
    ] as const) expect(moveFurniture(state, id, position).ok).toBe(true);
    setEditorMode(state, false);
    state.orders[0].state = 'cooking';
    expect(moveFurniture(state, 'stove-1', { x: 1, y: 0 }).ok).toBe(false);
  });

  it('не сохраняет флаг паузы и продолжает симуляцию после загрузки', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const adapter = new LocalStorageAdapter(storage);
    const state = createGame();
    state.customers.push(seatedGuest());
    setEditorMode(state, true);
    adapter.save(state);
    expect(JSON.parse(values.get('moy-restoran:primary')!).state.editorMode).toBeUndefined();
    const loaded = adapter.load();
    expect(loaded.editorMode).toBeUndefined();
    // Нормализация добавляет внешность и счётчики очереди, но не заменяет самого гостя.
    expect(loaded.customers).toMatchObject(state.customers);
    advanceSimulation(loaded);
    expect(loaded.tick).toBe(1);
  });
});
