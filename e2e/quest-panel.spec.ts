import { test, expect } from '@playwright/test';

test.describe('LOGIC-6.2 — панель квестов: 3 секции', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Играть' }).click();
    await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  });

  test('1. панель открывается и закрывается кнопкой Прогресс', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    await expect(panel).toHaveClass(/is-open/);
    await panel.getByRole('button', { name: 'Закрыть' }).click();
    await expect(panel).not.toHaveClass(/is-open/);
  });

  test('2. секция «Главные» — 10 квестов с уровнями и наградой', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    await expect(panel.getByRole('heading', { name: 'Главные задания' })).toBeVisible();
    await expect(panel.locator('.quest-item')).toHaveCount(10);
    const first = panel.locator('.quest-item').first();
    await expect(first).toContainText(/Награда:.*монет/);
  });

  test('3. секция «Побочные» — 18 квестов, locked серые с замком', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    await expect(panel.getByRole('heading', { name: 'Побочные задания' })).toBeVisible();
    await expect(panel.locator('.side-quest-item')).toHaveCount(18);
    // locked: минимум 1 (decor-windows зависит от decor-painting)
    const locked = panel.locator('.side-quest-item.is-locked');
    expect(await locked.count()).toBeGreaterThanOrEqual(1);
    await expect(locked.first()).toContainText('Требуется:');
    // награда в каждой строке (Q3=A)
    const first = panel.locator('.side-quest-item').first();
    await expect(first).toContainText(/\+\d+ монет/);
  });

  test('4. секция «Ежедневные» — 6 квестов с progress-bar', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    await expect(panel.getByRole('heading', { name: 'Ежедневные задания' })).toBeVisible();
    await expect(panel.locator('.daily-quest-item')).toHaveCount(6);
    await expect(panel.locator('.daily-quest-item meter')).toHaveCount(6);
  });

  test('5. daily-квест показывает X/N, полосу и награду', async ({ page }) => {
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    const daily = panel.locator('.daily-quest-item').first();
    // текст X/N
    await expect(daily).toContainText(/\d+\s*\/\s*\d+/);
    // progress-bar с max > 0
    const bar = daily.locator('meter');
    await expect(bar).toBeVisible();
    const max = await bar.getAttribute('max');
    expect(Number(max)).toBeGreaterThan(0);
    // награда (Q3=A)
    await expect(daily).toContainText(/\+.*монет/);
  });
});