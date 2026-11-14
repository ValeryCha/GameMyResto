import { expect, test } from '@playwright/test';

test('гость садится на стул, получает суп и выполняет первое задание', async ({ page }) => {
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
  await expect(hud).toContainText('Уровень: 1');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Официант — 200 монет' }).click();
  await expect(hud).toContainText('Монеты: 800');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стойка выдачи — 300 монет' }).click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 685, y: 354 } });
  await expect(hud).toContainText('Монеты: 500');

  await expect(page.getByTestId('restaurant-canvas')).toBeVisible();
  await page.screenshot({ path: 'artifacts/restaurant-guest-seated.png' });
  await expect(hud).toContainText('Монеты: 605', { timeout: 65_000 });
  await expect(hud).toContainText('Опыт: 40');
  await expect(page.getByLabel('Текущее задание')).toContainText('Задание 1: Первый гость');
  await page.screenshot({ path: 'artifacts/restaurant-ai-delivered.png' });

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText('Текущий баланс: 605 монет');
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Опыт: 40');
  await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
  await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
  await page.keyboard.press('KeyD');
  await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
  expect(errors).toEqual([]);
});
