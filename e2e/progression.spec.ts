import { expect, test } from '@playwright/test';

test('уровень бесплатно расширяет ресторан и сохраняется', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const key = 'moy-restoran:primary';
    const save = JSON.parse(localStorage.getItem(key)!);
    save.state.experience = 100;
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  await expect(hud).toContainText('Уровень: 2');
  await expect(hud).toContainText('Опыт: 100');
  await expect(page.getByLabel('Текущее задание')).toContainText('Задание 2: Новый рецепт');
  await expect(page.getByLabel('Текущее задание')).toContainText('60 опыта · 400 монет');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Магазин', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/restaurant-progression-mobile.png' });
});
