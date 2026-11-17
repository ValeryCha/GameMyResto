import { test, expect } from '@playwright/test';

test('панель прогресса показывает уровень и все задания', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(page.getByTestId('hud-status')).not.toContainText('Уровень:');
  await expect(page.getByTestId('hud-status')).not.toContainText('Опыт:');
  const hud = page.getByLabel('Показатели ресторана');
  await expect(hud.locator('.hud-action')).toHaveCount(5);
  await expect(hud.locator('.hud-action svg')).toHaveCount(5);
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
  await expect(panel).toHaveClass(/is-open/);
  await expect(panel.getByRole('progressbar')).toBeVisible();
  await expect(panel.locator('.quest-item')).toHaveCount(10);
  await expect(panel.locator('.quest-item.is-active')).toHaveCount(1);
  await expect(panel.locator('.quest-item.is-active')).toContainText('Купить официанта');
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await expect(panel).not.toHaveClass(/is-open/);
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  await panel.getByRole('button', { name: 'Закрыть' }).click();
  await expect(panel).not.toHaveClass(/is-open/);
});
