import { expect, test } from '@playwright/test';

test('магазин списывает точную цену и не платит за отмену или занятую клетку', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: '+50 000 монет' }).click();
  await expect(hud).toContainText('Монеты: 51000');
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText('51000');
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 51000');
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.coins = 1000;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await page.getByRole('button', { name: 'Одиночный стол — 100 монет' }).click();
  await canvas.click({ position: { x: 685, y: 354 } });
  await expect(hud).toContainText('Монеты: 800');
  await expect(hud).toContainText('Рейтинг: 11');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await page.getByRole('button', { name: 'Двойной стол — 200 монет' }).click();
  await canvas.click({ position: { x: 735, y: 385 } });
  await expect(hud).toContainText('Монеты: 400');
  await expect(hud).toContainText('Рейтинг: 13');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await page.getByRole('button', { name: 'Стул — 75 монет' }).click();
  await canvas.click({ position: { x: 620, y: 395 } });
  await expect(hud).toContainText('Монеты: 250');
  await expect(hud).toContainText('Рейтинг: 14');
  await page.screenshot({ path: 'artifacts/restaurant-shop-furniture.png' });

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await page.getByRole('button', { name: 'Стул — 75 монет' }).click();
  const occupiedBalance = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state.coins);
  await canvas.click({ position: { x: 685, y: 354 } });
  await expect(page.getByText('Клетка занята')).toBeVisible();
  await expect(hud).toContainText(`Монеты: ${occupiedBalance}`);
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByText(/Выберите клетку/)).toBeHidden();
  await expect(hud).toContainText(`Монеты: ${occupiedBalance}`);

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await page.getByRole('button', { name: 'Стул — 75 монет' }).click();
  const cancelledBalance = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state.coins);
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(hud).toContainText(`Монеты: ${cancelledBalance}`);

  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText(`Монеты: ${cancelledBalance}`);
  await expect(hud).toContainText('Рейтинг: 14');
  expect(errors).toEqual([]);
});


test('календарная награда и улучшения работают с учётом уровня', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  const cooking = shop.locator('[data-shop-item="cookingUpgrade"]');
  await expect(cooking).toBeDisabled();
  await expect(cooking).toHaveAttribute('aria-label', /Нужен 2 уровень/);
  await expect(shop.locator('[data-shop-item="daily"]')).toHaveCount(0);
  await shop.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  const calendar = page.getByRole('complementary', { name: 'Календарь наград' });
  const daily = calendar.locator('[data-calendar-claim]');
  await daily.click();
  await expect(hud).toContainText('Монеты: 1100');
  await expect(daily).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(calendar.locator('[data-calendar-claim]')).toBeDisabled();

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.level = 3;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-item="cookingUpgrade"]').click();
  await expect(hud).toContainText('Монеты: 800');
  await expect(shop.locator('[data-shop-item="cookingUpgrade"]')).toContainText('1/5');
  await shop.locator('[data-shop-category="staff"]').click();
  await shop.locator('[data-shop-item="waiterUpgrade"]').click();
  await expect(hud).toContainText('Монеты: 300');
  await expect(shop.locator('[data-shop-item="waiterUpgrade"]')).toContainText('1/5');
  expect(errors).toEqual([]);
});
