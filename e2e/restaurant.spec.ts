import { expect, test } from '@playwright/test';

test('покупка растения, гости и сохранение после перезагрузки', async ({ page }) => {
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
  const hud = page.getByTestId('hud-status');
  await expect(hud).toContainText('Монеты: 1000');
  await expect(hud).toContainText('Гости: 1');
  await page.screenshot({ path: 'artifacts/restaurant-3d-initial.png' });

  await page.getByRole('button', { name: 'Купить растение — 50 монет' }).click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 685, y: 354 } });
  await expect(hud).toContainText('Монеты: 950');
  await page.screenshot({ path: 'artifacts/restaurant-3d-planted.png' });

  await page.reload();
  await expect(page.getByTestId('hud-status')).toContainText('Монеты: 950');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Купить растение — 50 монет' })).toBeVisible();
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'artifacts/restaurant-mobile.png' });

  expect(errors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
