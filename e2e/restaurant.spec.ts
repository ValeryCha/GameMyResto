import { expect, test } from '@playwright/test';

test('покупка, возврат в меню, продолжение и новая игра', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Купить растение — 50 монет' }).click();
  await expect(page.getByText('Выберите свободную клетку')).toBeVisible();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 685, y: 354 } });
  await expect(page.getByText('Выберите свободную клетку')).toBeHidden();
  await expect(hud).toContainText('Монеты: 950');
  await page.screenshot({ path: 'artifacts/restaurant-3d-planted.png' });

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 950 монет');
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 950');
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 950 монет');
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await page.getByRole('button', { name: 'Начать заново' }).click();
  await expect(hud).toContainText('Монеты: 1000');

  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.getByTestId('hud-status')).toContainText('Монеты: 1000');
  await page.setViewportSize({ width: 390, height: 844 });
  const plantButton = page.getByRole('button', { name: 'Купить растение — 50 монет' });
  await expect(plantButton).toBeVisible();
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();
  const buttonBounds = await plantButton.boundingBox();
  const hudBounds = await hud.boundingBox();
  expect(buttonBounds!.x).toBeGreaterThanOrEqual(0);
  expect(buttonBounds!.x + buttonBounds!.width).toBeLessThanOrEqual(390);
  expect(hudBounds!.x + hudBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/restaurant-3d-mobile.png' });

  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
