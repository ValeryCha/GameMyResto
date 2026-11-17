import { expect, test } from '@playwright/test';

test('непрерывная установка автоматически докупает предметы и завершается кнопкой', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await expect(shop.locator('[data-quantity]')).toHaveCount(0);
  await page.locator('[data-shop-category="hall"]').click();
  await shop.getByRole('button', { name: 'Стул — 75 монет' }).click();
  for (const position of [{ x: 685, y: 354 }, { x: 735, y: 385 }]) await canvas.click({ position });
  await expect(page.getByText(/следующий покупается автоматически/)).toBeVisible();
  await expect(page.getByTestId('hud-status')).toContainText('Монеты: 775');
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByText(/Выберите клетку/)).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(saved.coins).toBe(775);
  expect(saved.furnitureInventory.chair).toBe(1);
  expect(saved.furniture.filter((item: { kind: string }) => item.kind === 'chair')).toHaveLength(3);
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('можно нанять пять официантов, но не шестого', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.getByRole('button', { name: '+50 000 монет' }).click();
  await shop.locator('[data-shop-category="staff"]').click();
  const hire = shop.locator('[data-shop-item="waiter"]');
  for (let count = 0; count < 5; count += 1) await hire.click();
  await expect(hire).toContainText('5/5');
  await expect(hire).toBeDisabled();
});

test('камера показывает весь ресторан 20×20 на широком и мобильном экранах', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.level = 33;
    save.state.width = 20;
    save.state.height = 20;
    save.state.purchasedGuestSlots = 10;
    save.state.guestLimit = 50;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'artifacts/restaurant-max-desktop.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Сбросить вид' }).click();
  await page.screenshot({ path: 'artifacts/restaurant-max-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
