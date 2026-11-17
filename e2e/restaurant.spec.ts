import { expect, test } from '@playwright/test';

test('покупка лояльности, возврат в меню, продолжение и новая игра', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const failedResponses: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  await expect(hud).toContainText('Монеты: 1000');
  await expect(hud).toContainText('Гости: 1');
  await page.screenshot({ path: 'artifacts/restaurant-3d-initial.png' });
  await page.getByTestId('restaurant-canvas').locator('canvas').hover();
  await page.mouse.wheel(0, 120);
  await page.mouse.move(800, 550);
  await page.mouse.down();
  await page.mouse.move(850, 580, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('KeyA');
  await page.getByRole('button', { name: 'Сбросить вид' }).click();

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="loyalty"]').click();
  await page.getByRole('button', { name: 'Мятный приём — 200 монет' }).click();
  await expect(hud).toContainText('Монеты: 800');
  await page.screenshot({ path: 'artifacts/restaurant-3d-loyalty.png' });
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 800 монет');
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 800');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 800 монет');
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await page.getByRole('button', { name: 'Начать заново' }).click();
  await expect(hud).toContainText('Монеты: 1000');

  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 1000');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/restaurant-3d-mobile.png' });
  const shopButton = page.getByRole('button', { name: 'Магазин', exact: true });
  await expect(shopButton).toBeVisible();
  await shopButton.click();
  await page.locator('[data-shop-category="loyalty"]').click();
  const loyaltyButton = page.getByRole('button', { name: 'Мятный приём — 200 монет' });
  await expect(loyaltyButton).toBeVisible();
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();
  const buttonBounds = await loyaltyButton.boundingBox();
  const hudBounds = await hud.boundingBox();
  expect(buttonBounds!.x).toBeGreaterThanOrEqual(0);
  expect(buttonBounds!.x + buttonBounds!.width).toBeLessThanOrEqual(390);
  expect(hudBounds!.x + hudBounds!.width).toBeLessThanOrEqual(390);

  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
