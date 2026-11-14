import { expect, test } from '@playwright/test';

test('главное меню и вспомогательные экраны', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Мой ресторан' })).toBeVisible();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 1000 монет');
  await page.screenshot({ path: 'artifacts/menu-desktop.png' });

  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Звук' }).uncheck();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Об игре' }).click();
  await expect(page.getByText(/Принимайте гостей/)).toBeVisible();
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.getByRole('button', { name: 'Новая игра' }).click();
  await expect(page.getByText('Удалить текущий прогресс?')).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByTestId('menu-balance')).toHaveText('Текущий баланс: 1000 монет');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Играть' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Об игре' })).toBeInViewport();
  await page.screenshot({ path: 'artifacts/menu-mobile.png' });
  expect(errors).toEqual([]);
});
