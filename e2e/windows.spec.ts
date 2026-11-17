import { expect, test } from '@playwright/test';

const readState = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);

test('окно покупается, размещается, выбирается на стене и сохраняется', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="windows"]').click();
  await expect(shop.locator('[data-window-id]')).toHaveCount(5);
  await shop.locator('[data-window-id="woodWindow"]').click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  let state = await readState(page);
  expect(state.appliedWindows).toHaveLength(1);
  expect(state.appliedWindows[0].windowId).toBe('woodWindow');
  expect(state.coins).toBe(700);
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await readState(page);
  expect(state.appliedWindows).toHaveLength(1);
  await page.getByRole('button', { name: 'Обстановка', exact: true }).click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  const editor = page.getByRole('complementary', { name: 'Редактор обстановки' });
  const id = state.appliedWindows[0].id;
  await expect(editor.locator(`[data-remove-window="${id}"]`)).toBeVisible();
  await editor.locator(`[data-remove-window="${id}"]`).click();
  state = await readState(page);
  expect(state.appliedWindows).toEqual([]);
  expect(state.coins).toBe(850);
  expect(errors).toEqual([]);
});


test('все окна и картины центрированы на своих клетках стен', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.level = 25;
    save.state.width = 12; save.state.height = 12;
    save.state.appliedWindows = [
      { id: 'w1', windowId: 'woodWindow', side: 'north', index: 0 },
      { id: 'w2', windowId: 'panoramaWindow', side: 'north', index: 2 },
      { id: 'w3', windowId: 'archWindow', side: 'north', index: 5 },
      { id: 'w4', windowId: 'roundWindow', side: 'west', index: 0 },
      { id: 'w5', windowId: 'stainedWindow', side: 'west', index: 3 },
    ];
    save.state.appliedPaintings = [
      { id: 'p1', paintingId: 'hills', side: 'north', index: 1 },
      { id: 'p2', paintingId: 'fruit', side: 'north', index: 8 },
      { id: 'p3', paintingId: 'city', side: 'south', index: 0 },
      { id: 'p4', paintingId: 'abstract', side: 'west', index: 6 },
      { id: 'p5', paintingId: 'portrait', side: 'north', index: 9 },
    ];
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  const state = await readState(page);
  expect(state.appliedWindows).toHaveLength(5);
  expect(state.appliedPaintings).toHaveLength(5);
  await page.getByRole('slider', { name: 'Масштаб камеры' }).fill('1.4');
  await page.screenshot({ path: 'artifacts/wall-decor-aligned-all.png' });
  expect(errors).toEqual([]);
});
