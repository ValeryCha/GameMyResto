import { expect, test } from '@playwright/test';

test('5 официантов и 4 стойки: 300 тиков без зависания в idle или у стойки', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createGame } = await import('../src/simulation/createGame');
    const { advanceSimulation } = await import('../src/simulation/tick');
    const state = createGame();
    state.width = 20;
    state.height = 20;
    state.arrivalProgress = -10_000;
    state.employees = [];
    state.furniture = state.furniture.filter((item) => item.kind === 'door');
    for (let index = 0; index < 4; index += 1) state.furniture.push({ id: `counter-${index}`, kind: 'counter', position: { x: 1, y: 1 + index * 3 }, rotation: 0 });
    for (let index = 0; index < 5; index += 1) {
      const y = 1 + index * 3;
      state.employees.push({ id: `waiter-${index}`, role: 'waiter', position: { x: 3, y }, energy: 100 });
      state.furniture.push(
        { id: `table-${index}`, kind: 'table', position: { x: 10, y }, rotation: 0 },
        { id: `chair-${index}`, kind: 'chair', position: { x: 10, y: y + 1 }, rotation: 0 },
      );
      state.customers.push({ id: `guest-${index}`, position: { x: 10, y: y + 1 }, state: 'waitingFood', patience: 10_000, foodWait: 10_000, seatId: `chair-${index}`, orderId: `order-${index}` });
      state.orders.push({ id: `order-${index}`, customerId: `guest-${index}`, state: 'waitingDelivery', progress: 6, dishId: 'soup' });
    }
    const idle = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    const stuck = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    const maxIdle = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    const maxStuck = Object.fromEntries(state.employees.map((waiter) => [waiter.id, 0]));
    let delivered = 0;
    for (let tick = 0; tick < 300; tick += 1) {
      const previous = new Map(state.employees.map((waiter) => [waiter.id, { ...waiter.position }]));
      advanceSimulation(state, 1);
      delivered += state.orders.filter((order) => order.state === 'delivered').length;
      for (const waiter of state.employees) {
        const order = state.orders.find((item) => item.id === waiter.taskId);
        idle[waiter.id] = order ? 0 : idle[waiter.id] + 1;
        stuck[waiter.id] = order && !order.pickedUp && previous.get(waiter.id)?.x === waiter.position.x && previous.get(waiter.id)?.y === waiter.position.y ? stuck[waiter.id] + 1 : 0;
        maxIdle[waiter.id] = Math.max(maxIdle[waiter.id], idle[waiter.id]);
        maxStuck[waiter.id] = Math.max(maxStuck[waiter.id], stuck[waiter.id]);
      }
      for (let index = 0; index < 5; index += 1) {
        const order = state.orders.find((item) => item.id === `order-${index}`)!;
        if (order.state !== 'delivered') continue;
        const guest = state.customers.find((item) => item.id === `guest-${index}`)!;
        guest.position = { x: 10, y: 2 + index * 3 };
        guest.state = 'waitingFood';
        guest.foodWait = 10_000;
        guest.seatId = `chair-${index}`;
        guest.target = undefined;
        order.state = 'waitingDelivery';
        order.assignedTo = undefined;
        order.pickedUp = false;
      }
    }
    return { delivered, maxIdle, maxStuck };
  });
  expect(result.delivered).toBeGreaterThan(100);
  for (const streak of Object.values(result.maxIdle)) expect(streak).toBeLessThanOrEqual(2);
  for (const streak of Object.values(result.maxStuck)) expect(streak).toBeLessThanOrEqual(2);
});
