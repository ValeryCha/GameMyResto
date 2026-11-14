import { expect, test } from '@playwright/test';

test('магазин списывает точную цену и не платит за отмену или занятую клетку', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: '+50 000 монет' }).click();
  await expect(hud).toContainText('Монеты: 51000');
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await expect(page.getByTestId('menu-balance')).toContainText('51000');
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 51000');
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.coins = 1000;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стол 1×1 — 100 монет' }).click();
  await canvas.click({ position: { x: 685, y: 354 } });
  await expect(hud).toContainText('Монеты: 900');
  await expect(hud).toContainText('Рейтинг: 11');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стол 2×1 — 200 монет' }).click();
  await canvas.click({ position: { x: 735, y: 385 } });
  await expect(hud).toContainText('Монеты: 700');
  await expect(hud).toContainText('Рейтинг: 13');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стул — 75 монет' }).click();
  await canvas.click({ position: { x: 620, y: 395 } });
  await expect(hud).toContainText('Монеты: 625');
  await expect(hud).toContainText('Рейтинг: 14');
  await page.screenshot({ path: 'artifacts/restaurant-shop-furniture.png' });

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Растение — 50 монет' }).click();
  await canvas.click({ position: { x: 685, y: 354 } });
  await expect(page.getByText('Клетка занята')).toBeVisible();
  await expect(hud).toContainText('Монеты: 625');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByText(/Выберите клетку/)).toBeHidden();
  await expect(hud).toContainText('Монеты: 625');

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.getByRole('button', { name: 'Стул — 75 монет' }).click();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(hud).toContainText('Монеты: 625');

  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 625');
  await expect(hud).toContainText('Рейтинг: 14');
  expect(errors).toEqual([]);
});
