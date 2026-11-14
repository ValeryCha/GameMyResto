import { expect, test } from '@playwright/test';

test('гость получает заказ, а персонажи продолжают работать без ошибок', async ({ page }) => {
  test.setTimeout(75_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  await expect(hud).toContainText('Гости: 1');
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'artifacts/restaurant-ai-guest.png' });
  await expect(hud).toContainText(/Монеты: (1035|1050|1070)/, { timeout: 55_000 });
  await expect(hud).toContainText('Опыт: 10');
  await page.screenshot({ path: 'artifacts/restaurant-ai-delivered.png' });
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText(/Текущий баланс: (1035|1050|1070) монет/);
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Опыт: 10');
  expect(errors).toEqual([]);
});
