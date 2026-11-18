import { expect, test } from '@playwright/test';

test('HUD показывает места, поток, команду и следующий апгрейд', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const metrics = page.getByTestId('hud-metrics');
  await expect(metrics).toHaveAttribute('open', '');
  await expect(metrics).toContainText(/Места: \d+ занято \/ 1 · Очередь: \d+\/5/);
  await expect(metrics).toContainText(/Поток: [\d.]+ приход \/ [\d.]+ обслуж\. за 60 тиков/);
  await expect(metrics).toContainText('Официанты: 0/5 · Стойки: 0/5 · Повара: 1/5 · Плиты: 1/5');
  await expect(metrics).toContainText('Узкое звено');
  await expect(page.getByTestId('rating-trend')).toHaveAttribute('aria-label', /Тренд рейтинга за 60 тиков:/);
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const progress = page.getByRole('complementary', { name: 'Прогресс ресторана' });
  await expect(progress).toContainText('Тренд за 60 тиков:');
  await expect(progress).toContainText('Официанты: 0/5');
  await expect(progress).toContainText('Узкое звено');
  await page.waitForFunction(() => localStorage.getItem('moy-restoran:primary') !== null);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(saved.ratingHistory).toBeUndefined();
});

test('на узком экране подробности потока открываются по нажатию', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const metrics = page.getByTestId('hud-metrics');
  await expect(metrics).not.toHaveAttribute('open', '');
  await expect(metrics.locator('summary')).toContainText(/Места: .*Очередь:/);
  await metrics.locator('summary').click();
  await expect(metrics).toHaveAttribute('open', '');
  await expect(metrics).toContainText('Поток:');
  await expect(metrics).toContainText('Повара: 1/5');
  const metricsBox = (await metrics.boundingBox())!;
  const peakBox = (await page.getByTestId('peak-banner').boundingBox())!;
  const queueBox = (await page.getByTestId('guest-queue').boundingBox())!;
  expect(peakBox.y).toBeGreaterThanOrEqual(metricsBox.y + metricsBox.height);
  expect(queueBox.y).toBeGreaterThanOrEqual(peakBox.y + peakBox.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
