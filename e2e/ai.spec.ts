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
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  await expect(page.getByLabel('Прогресс ресторана')).toContainText('Уровень 1');
  await page.getByLabel('Прогресс ресторана').getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="staff"]').click();
  await page.getByRole('button', { name: 'Официант — 200 монет' }).click();
  await expect(hud).toContainText('Монеты: 900');
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="kitchen"]').click();
  await page.getByRole('button', { name: 'Стойка выдачи — 300 монет' }).click();
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');
  for (const position of [{ x: 685, y: 354 }, { x: 735, y: 385 }, { x: 600, y: 420 }]) {
    await canvas.click({ position });
    const placed = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state.furniture.some((item: { kind: string }) => item.kind === 'counter'));
    if (placed) break;
  }
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(hud).toContainText('Монеты: 500');

  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const starterProgress = page.getByLabel('Прогресс ресторана');
  await expect(starterProgress.locator('.quest-item.is-complete')).toHaveCount(2);
  await expect(starterProgress.locator('.quest-item.is-complete').filter({ hasText: 'Купить официанта' })).toHaveCount(1);
  await expect(starterProgress.locator('.quest-item.is-complete').filter({ hasText: 'Купить стойку выдачи заказов' })).toHaveCount(1);
  await expect(starterProgress.locator('.quest-item.is-active')).toHaveCount(1);
  await expect(starterProgress.locator('.quest-item.is-active')).toContainText('Первый гость');
  await starterProgress.getByRole('button', { name: 'Закрыть' }).click();

  await expect(page.getByTestId('restaurant-canvas')).toBeVisible();
  await page.screenshot({ path: 'artifacts/restaurant-guest-seated.png' });
  await expect(hud).toContainText('Монеты: 565', { timeout: 65_000 });
  const toast = page.getByLabel('Уведомление о прогрессе');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Задание выполнено: Первый гость. +60 монет');
  await page.screenshot({ path: 'artifacts/restaurant-ai-delivered.png' });
  await expect(toast).toBeHidden({ timeout: 3_500 });
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const progress = page.getByLabel('Прогресс ресторана');
  await expect(progress).toContainText('60 / 120 опыта');
  await expect(progress.locator('.quest-item.is-complete').filter({ hasText: 'Первый гость' })).toHaveCount(1);
  await progress.getByRole('button', { name: 'Закрыть' }).click();

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText('Текущий баланс: 565 монет');
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.getByLabel('Уведомление о прогрессе')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
  await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
  await page.keyboard.press('KeyD');
  await expect(page.getByLabel('Отладка состояния гостей')).toHaveCount(0);
  expect(errors).toEqual([]);
});
