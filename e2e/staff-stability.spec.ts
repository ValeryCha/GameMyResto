import { expect, test, type Page } from '@playwright/test';

async function startWithStaff(page: Page, waiters: number, mature = false): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.getByRole('button', { name: '+50 000 монет' }).click();
  await shop.locator('[data-shop-category="staff"]').click();
  const hire = shop.locator('[data-shop-item="waiter"]');
  for (let count = 0; count < waiters; count += 1) await hire.click();
  await expect(hire).toContainText(`Нанято: ${waiters}/5`);
  await shop.locator('[data-shop-category="kitchen"]').click();
  await shop.getByRole('button', { name: 'Стойка выдачи — 300 монет' }).click();
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');
  for (const position of [{ x: 685, y: 354 }, { x: 735, y: 385 }, { x: 600, y: 420 }]) {
    await canvas.click({ position });
    const placed = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state.furniture.some((item: { kind: string }) => item.kind === 'counter'));
    if (placed) break;
  }
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  if (mature) {
    await page.getByRole('button', { name: 'Меню', exact: true }).click();
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
      Object.assign(save.state, {
        level: 33, width: 20, height: 20, purchasedGuestSlots: 10, guestLimit: 50,
        servedTotal: 250, revenueTotal: 10_000,
      });
      localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Играть' }).click();
  }
  return errors;
}

for (const waiters of [2, 3, 5]) {
  test(`${waiters} официанта${waiters === 5 ? ' на максимальном уровне' : ''}: симуляция и заказы продолжаются без кликов по персоналу`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await startWithStaff(page, waiters, waiters === 5);

    try {
      await page.waitForFunction(() => {
        const save = JSON.parse(localStorage.getItem('moy-restoran:primary') ?? 'null');
        return save?.state.tick >= 30 && save?.state.servedTotal >= 1;
      }, undefined, { timeout: 65_000 });
      const tick = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state.tick);
      await page.waitForFunction((previousTick) => {
        const save = JSON.parse(localStorage.getItem('moy-restoran:primary') ?? 'null');
        return save?.state.tick >= previousTick + 10;
      }, tick, { timeout: 25_000 });
    } catch (error) {
      const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!)?.state);
      throw new Error(`${(error as Error).message}\nСостояние: ${JSON.stringify(snapshot)}\nОшибки: ${JSON.stringify(errors)}`);
    }

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
    expect(state.employees.filter((employee: { role: string }) => employee.role === 'waiter')).toHaveLength(waiters);
    expect(state.customers.length).toBeLessThanOrEqual(state.guestLimit);
    expect(state.orders.filter((order: { state: string; assignedTo?: string }) => order.state === 'waitingDelivery' && !order.assignedTo)).toHaveLength(0);
    expect(errors).toEqual([]);
  });
}
