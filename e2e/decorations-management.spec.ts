import { expect, test } from '@playwright/test';

const readState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);

test('дверь и пол бесплатно сбрасываются, обои снимаются по одной клетке', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-wallpaper-id="creamStripes"]').click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="floors"]').click();
  await shop.locator('[data-floor-id="simpleTile"]').click();
  await shop.locator('[data-decoration-section="doors"]').click();
  await expect(shop.locator('[data-door-id]')).toHaveCount(5);
  await shop.locator('[data-door-id="oak"]').click();
  let state = await readState(page);
  expect(state.coins).toBe(350);
  expect(state.activeDoorPattern).toBe('oak');
  expect(state.ownedDoorPatterns).toEqual(['oak']);
  await expect(shop.locator('[data-door-id="oak"]')).toHaveAttribute('aria-label', /Активен/);
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await readState(page);
  expect(state.activeDoorPattern).toBe('oak');
  expect(state.activeWallpaperId).toBe('creamStripes');
  expect(state.activeFloorPattern).toBe('simpleTile');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Обстановка', exact: true }).click();
  const editor = page.getByRole('complementary', { name: 'Редактор обстановки' });
  await editor.locator('[data-remove-decoration="door"]').click();
  expect((await readState(page)).coins).toBe(350);
  expect((await readState(page)).activeDoorPattern).toBeNull();
  await editor.locator('[data-remove-decoration="wallpaper"]').click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  expect((await readState(page)).coins).toBe(350);
  expect((await readState(page)).activeWallpaperId).toBeNull();
  await editor.locator('[data-remove-decoration="floor"]').click();
  expect((await readState(page)).coins).toBe(350);
  expect((await readState(page)).activeFloorPattern).toBeNull();
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await readState(page);
  expect(state.coins).toBe(350);
  expect(state.activeDoorPattern).toBeNull();
  expect(state.activeWallpaperId).toBeNull();
  expect(state.activeFloorPattern).toBeNull();
  expect(errors).toEqual([]);
});

test('купленная дверь применяется повторно без списания монет', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    Object.assign(save.state, { level: 5, ownedDoorPatterns: ['oak', 'glass'], activeDoorPattern: 'glass' });
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="doors"]').click();
  await shop.locator('[data-door-id="oak"]').click();
  const state = await readState(page);
  expect(state.coins).toBe(1000);
  expect(state.activeDoorPattern).toBe('oak');
});

test('клик вне панели закрывает магазин, прогресс и календарь', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const overlay = page.locator('.panel-overlay');
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await expect(overlay).toBeVisible();
  await shop.getByRole('button', { name: '+50 000 монет' }).click();
  await expect(shop).toHaveClass(/is-open/);
  await overlay.click({ position: { x: 5, y: 5 } });
  await expect(shop).not.toHaveClass(/is-open/);
  await expect(overlay).toBeHidden();

  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  await overlay.click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.quest-panel')).not.toHaveClass(/is-open/);
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await overlay.click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.calendar-panel')).not.toHaveClass(/is-open/);
  await page.getByRole('button', { name: 'Обстановка', exact: true }).click();
  await expect(overlay).toBeHidden();
  await page.getByRole('button', { name: 'Вернуться в игру', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Редактор обстановки' })).toBeHidden();
});

test('официант подписывает только доставку желаемого блюда', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.employees.push({ id: 'waiter-label', role: 'waiter', position: { x: 0, y: 0 }, energy: 100, taskId: 'order-label' });
    save.state.customers.push({ id: 'guest-label', position: { x: 7, y: 7 }, state: 'waitingFood', patience: 100, orderId: 'order-label', hasDesire: true, desiredDishId: 'soup' });
    save.state.orders.push({ id: 'order-label', customerId: 'guest-label', state: 'waitingDelivery', progress: 100, dishId: 'soup', desired: true, pickedUp: true });
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.locator('.delivery-label')).toContainText('Несу:');
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.orders[0].desired = false;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.locator('.delivery-label')).toHaveCount(0);
});
