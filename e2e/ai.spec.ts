import { expect, test } from '@playwright/test';

test('после найма официанта и покупки стойки гость получает заказ', async ({ page }) => {
  test.setTimeout(90_000);
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
  await expect(hud).toContainText('Монеты: 1000');
  await expect(hud).toContainText('Гости: 1');
  await expect(page.getByTestId('restaurant-canvas').locator('canvas')).toBeVisible();

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Официант — 200 монет' }).click();
  await expect(hud).toContainText('Монеты: 800');
  await expect(hud).toContainText('Рейтинг: 20');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стойка выдачи — 300 монет' }).click();
  await expect(page.getByText(/Выберите клетку/)).toBeVisible();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 685, y: 354 } });
  await expect(hud).toContainText('Монеты: 500');
  await expect(page.getByText(/Выберите клетку/)).toBeHidden();
  await page.screenshot({ path: 'artifacts/restaurant-ai-guest.png' });

  await expect(hud).toContainText(/Монеты: (535|550|570)/, { timeout: 65_000 });
  await expect(hud).toContainText('Опыт: 10');
  await page.screenshot({ path: 'artifacts/restaurant-ai-delivered.png' });
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText(/Текущий баланс: (535|550|570) монет/);
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Опыт: 10');
  expect(errors).toEqual([]);
});
