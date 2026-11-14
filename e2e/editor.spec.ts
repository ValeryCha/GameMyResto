import { expect, test } from '@playwright/test';

test('редактор перемещает, вращает и удаляет мебель с возвратом 50%', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const hud = page.getByTestId('hud-status');
  await page.getByRole('button', { name: 'Обстановка' }).click();
  const panel = page.getByLabel('Редактор обстановки');
  await expect(panel).toBeVisible();
  const canvas = page.getByTestId('restaurant-canvas').locator('canvas');
  await page.mouse.move(800, 560);
  await page.mouse.down();
  await page.mouse.move(850, 590, { steps: 5 });
  await page.mouse.up();
  await expect(panel).not.toContainText('Стул');
  await page.getByRole('button', { name: 'Сбросить вид' }).click();
  await canvas.click({ position: { x: 635, y: 460 } });
  await expect(panel).toContainText('Стул');
  await page.getByRole('button', { name: 'Переместить', exact: true }).click();
  await canvas.click({ position: { x: 600, y: 420 } });
  await expect(page.getByRole('button', { name: 'Переместить', exact: true })).toBeVisible();
  await expect(hud).toContainText('Монеты: 1000');
  await page.getByRole('button', { name: 'Повернуть', exact: true }).click();
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toContain('вернуть 37 монет');
    void dialog.accept();
  });
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(hud).toContainText('Монеты: 1037');
  await page.screenshot({ path: 'artifacts/restaurant-editor.png' });
  await page.getByRole('button', { name: 'Вернуться в игру' }).click();
  await expect(panel).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(hud).toContainText('Монеты: 1037');
  expect(errors).toEqual([]);
});
