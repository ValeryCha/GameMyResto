import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import type { Furniture, GameState } from '../src/simulation/types';

function denseFourByFour(): GameState {
  const state = createGame();
  state.width = 10;
  state.height = 10;
  state.arrivalProgress = -10_000;
  state.employees = [];
  const layout: Array<[string, Furniture['kind'], number, number, (0 | 90 | 180 | 270)?]> = [
    ['door-1', 'door', 0, 9], ['stove-1', 'stove', 0, 0, 90],
    ['table-1', 'table', 5, 4], ['chair-1', 'chair', 5, 5],
    ['counter-1', 'counter', 0, 1], ['counter-2', 'counter', 1, 1], ['counter-3', 'counter', 2, 1], ['counter-4', 'counter', 3, 1],
    ['table-2', 'tableDouble', 6, 4], ['chair-2', 'chair', 6, 5], ['chair-3', 'chair', 7, 5],
    ['table-3', 'table', 5, 0], ['chair-4', 'chair', 6, 0, 90], ['chair-5', 'chair', 4, 0, 270],
    ['table-4', 'table', 0, 4], ['chair-6', 'chair', 0, 5], ['chair-7', 'chair', 0, 3, 180],
    ['table-5', 'tableDouble', 3, 6, 90], ['chair-8', 'chair', 4, 7, 90], ['chair-9', 'chair', 4, 6, 90],
    ['table-6', 'tableDouble', 7, 9], ['chair-10', 'chair', 9, 9, 90], ['chair-11', 'chair', 6, 9, 270],
    ['table-7', 'tableDouble', 8, 7], ['chair-12', 'chair', 9, 6, 180], ['chair-13', 'chair', 8, 6, 180],
    ['table-8', 'table', 8, 2], ['chair-14', 'chair', 8, 1, 180],
  ];
  state.furniture = layout.map(([id, kind, x, y, rotation]) => ({ id, kind, position: { x, y }, rotation: rotation ?? 0 }));
  for (let index = 0; index < 4; index += 1) {
    state.employees.push({ id: `waiter-${index + 1}`, role: 'waiter', position: { x: 2 + index * 2, y: 3 }, energy: 100 });
  }
  for (let index = 0; index < 14; index += 1) {
    const chair = state.furniture.find((item) => item.id === `chair-${index === 0 ? 1 : index + 1}`)!;
    state.customers.push({ id: `guest-${index + 1}`, position: { ...chair.position }, state: 'waitingFood', patience: 10_000, foodWait: 10_000, seatId: chair.id, orderId: `order-${index + 1}` });
    state.orders.push({ id: `order-${index + 1}`, customerId: `guest-${index + 1}`, state: 'waitingDelivery', progress: 6, dishId: 'soup' });
  }
  return state;
}

describe('официанты в плотной планировке 4/4', () => {
  it('доставляют все готовые заказы без взаимных блокировок', () => {
    const state = denseFourByFour();
    advanceSimulation(state, 300);
    expect(state.servedTotal, JSON.stringify({ served: state.servedTotal, employees: state.employees, customers: state.customers, orders: state.orders })).toBe(14);
  });

  it('не оставляет готовые заказы надолго в непрерывном цикле 600 тиков', () => {
    const state = denseFourByFour();
    // Как и настоящая кухня, поддерживаем четыре активных заказа, а не бесконечную очередь всех 14 столов.
    state.customers = state.customers.slice(0, 4);
    state.orders = state.orders.slice(0, 4);
    state.tick = 2;
    const ages = new Map<string, number>();
    let delivered = 0;
    let maxReadyAge = 0;
    for (let tick = 0; tick < 600; tick += 1) {
      advanceSimulation(state, 1);
      for (const order of state.orders) {
        if (order.state === 'delivered') {
          delivered += 1;
          ages.set(order.id, 0);
          const guest = state.customers.find((item) => item.id === order.customerId)!;
          guest.state = 'waitingFood';
          guest.foodWait = 10_000;
          order.state = 'waitingDelivery';
          order.assignedTo = undefined;
          order.pickedUp = false;
        }
        const age = order.state === 'waitingDelivery' && !order.pickedUp ? (ages.get(order.id) ?? 0) + 1 : 0;
        ages.set(order.id, age);
        maxReadyAge = Math.max(maxReadyAge, age);
      }
    }
    expect(delivered).toBeGreaterThan(100);
    expect(maxReadyAge, JSON.stringify({ employees: state.employees, customers: state.customers, ages: Object.fromEntries(ages), orders: state.orders })).toBeLessThan(90);
  });

  it('сразу удаляет заказ ушедшего гостя и не оставляет его в выдаче', () => {
    const state = denseFourByFour();
    const guest = state.customers[0];
    guest.state = 'leaving';
    guest.seatId = undefined;
    guest.target = { x: 0, y: 8 };

    advanceSimulation(state, 1);

    expect(state.orders.some((order) => order.id === 'order-1')).toBe(false);
    expect(state.employees.some((waiter) => waiter.taskId === 'order-2')).toBe(true);
  });

  it('без готовых заказов возвращается к своей стойке и остаётся на месте', () => {
    const state = denseFourByFour();
    state.orders = [];
    for (const guest of state.customers) guest.state = 'eating';
    state.tick = 2;
    advanceSimulation(state, 60);
    const positions = state.employees.map((waiter) => ({ ...waiter.position }));
    for (let index = 0; index < 4; index += 1) {
      const counter = state.furniture.find((item) => item.id === `counter-${index + 1}`)!;
      const waiter = state.employees[index];
      expect(Math.abs(waiter.position.x - counter.position.x) + Math.abs(waiter.position.y - counter.position.y)).toBe(1);
    }
    advanceSimulation(state, 20);
    expect(state.employees.map((waiter) => waiter.position)).toEqual(positions);
  });
});
