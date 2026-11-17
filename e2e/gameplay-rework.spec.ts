import { test, expect } from '@playwright/test';

test('календарь содержит 30 дней, выдаёт награду один раз и не пересекается с магазином', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Календарь наград' });
  await expect(panel).toHaveClass(/is-open/);
  await expect(panel.locator('[data-calendar-day]')).toHaveCount(30);
  await expect(panel.locator('[data-calendar-day="0"]')).toContainText('100');
  await expect(panel.locator('[data-calendar-day="29"]')).toContainText('1550');
  const claim = panel.locator('[data-calendar-claim]');
  await expect(claim).toBeEnabled();
  await claim.click();
  await expect(panel.locator('[data-calendar-toast]')).toContainText('100');
  await expect(claim).toBeDisabled();
  await panel.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await expect(panel).not.toHaveClass(/is-open/);
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Магазин ресторана' })).not.toHaveClass(/is-open/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel.locator('[data-calendar-day]')).toHaveCount(30);
  expect(await panel.locator('.calendar-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/gameplay-calendar-mobile.png' });
  await panel.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="recipes"]').click();
  await expect(shop.locator('[data-dish-id]')).toHaveCount(32);
  await expect(shop.locator('.shop-category--recipes [data-dish-id]:visible')).toHaveCount(4);
  await expect(page.getByTestId('shop-page-status')).toHaveText('Страница 1 из 8');
  await page.screenshot({ path: 'artifacts/gameplay-shop-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: 'artifacts/gameplay-shop-desktop.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('семь пригодных мест заполняются семью гостями без превышения цели', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  const result = await page.evaluate(async () => {
    const { advanceSimulation } = await import('../src/simulation/tick');
    const { countUsableSeats, targetGuestCount } = await import('../src/simulation/guestFlow');
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    const state = save.state;
    const tables = [[2, 0], [4, 0], [6, 0], [2, 3], [4, 3], [6, 3], [4, 6]];
    state.furniture = [
      { id: 'door', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 },
      { id: 'stove', kind: 'stove', position: { x: 1, y: 6 }, rotation: 0 },
      { id: 'counter', kind: 'counter', position: { x: 1, y: 5 }, rotation: 0 },
      ...tables.map(([x, y], index) => ({ id: `table-${index}`, kind: 'table', position: { x, y }, rotation: 0 })),
      ...tables.map(([x, y], index) => ({ id: `chair-${index}`, kind: 'chair', position: { x, y: y + 1 }, rotation: 0 })),
    ];
    state.employees = [{ id: 'waiter', role: 'waiter', position: { x: 0, y: 6 }, energy: 100 }];
    state.customers = [];
    state.orders = [];
    state.guestLimit = 7;
    advanceSimulation(state, 90);
    return { usable: countUsableSeats(state), target: targetGuestCount(state), active: state.customers.length };
  });
  expect(result).toEqual({ usable: 7, target: 7, active: 7 });
});

test('желание без рецепта не снижает рейтинг, а купленное оплачивается пятикратно', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  const result = await page.evaluate(async () => {
    const { createGuestOrder, paymentFor } = await import('../src/simulation/orders');
    const { DISHES } = await import('../src/content/dishes');
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    const state = save.state;
    state.level = 2;
    state.popularity = 50;
    const missing = { id: 'missing', position: { x: 5, y: 5 }, state: 'ordering' as const, patience: 300, hasDesire: true, desiredDishId: 'pasta' };
    const order = createGuestOrder(state, missing);
    const ratingAfterMissing = state.popularity;
    state.unlockedDishIds.push('pasta');
    const desired = createGuestOrder(state, { ...missing, state: 'ordering' });
    state.popularity = 0;
    return {
      missingOrder: order,
      ratingAfterMissing,
      desiredPayment: paymentFor(state, DISHES[1], Boolean(desired?.desired)),
      normalPayment: paymentFor(state, DISHES[1], false),
    };
  });
  expect(result.missingOrder).toBeUndefined();
  expect(result.ratingAfterMissing).toBe(50);
  expect(result.desiredPayment).toBe(result.normalPayment * 5);
});

test('50 гостей и новые поля сохраняются после перезагрузки без ошибок и переполнения', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const baselineFrameMs = await page.evaluate(async () => {
    const intervals: number[] = [];
    let previous = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        intervals.push(now - previous);
        previous = now;
        if (intervals.length >= 30) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return intervals.slice(1).reduce((sum, value) => sum + value, 0) / (intervals.length - 1);
  });
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    const state = save.state;
    state.level = 33;
    state.purchasedGuestSlots = 10;
    state.guestLimit = 50;
    state.unlockedDishIds = ['soup', 'pasta'];
    state.customers = Array.from({ length: 50 }, (_, index) => ({
      id: `load-${index}`, position: { x: index % 8, y: Math.floor(index / 8) },
      state: 'waitingFood', patience: 10000, foodWait: 10000,
    }));
    state.orders = [];
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.getByLabel('Трёхмерный зал ресторана')).toBeVisible();
  const averageFrameMs = await page.evaluate(async () => {
    const intervals: number[] = [];
    let previous = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        intervals.push(now - previous);
        previous = now;
        if (intervals.length >= 90) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return intervals.slice(1).reduce((sum, value) => sum + value, 0) / (intervals.length - 1);
  });
  await page.screenshot({ path: 'artifacts/gameplay-50-guests.png' });
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  const saved = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    return {
      slots: save.state.purchasedGuestSlots,
      limit: save.state.guestLimit,
      recipes: save.state.unlockedDishIds,
      appearance: save.state.customers.every((guest: { hairStyle?: string }) => Boolean(guest.hairStyle)),
      backup: Boolean(localStorage.getItem('moy-restoran:backup')),
    };
  });
  expect(saved).toEqual({ slots: 10, limit: 50, recipes: ['soup', 'pasta'], appearance: true, backup: true });
  expect(averageFrameMs, JSON.stringify({ baselineFrameMs, averageFrameMs })).toBeLessThan(baselineFrameMs * 1.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
