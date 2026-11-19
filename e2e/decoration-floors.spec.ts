import { expect, test } from '@playwright/test';

test('пол покупается один раз, сохраняется и автоматически покрывает расширение', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="floors"]').click();
  await expect(shop.locator('[data-floor-id]')).toHaveCount(5);
  await shop.locator('[data-floor-id="simpleTile"]').click();
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(state.coins).toBe(800);
  expect(state.activeFloorPattern).toBe('simpleTile');
  expect(state.ownedFloorPatterns).toEqual(['simpleTile']);
  expect(state.decorationRatingBonus).toBe(10);
  await expect(shop.locator('[data-floor-id="simpleTile"]')).toHaveAttribute('aria-label', /Активен/);
  await page.screenshot({ path: 'artifacts/floor-shop-desktop.png' });
  await shop.getByRole('button', { name: 'Закрыть' }).click();
  await page.screenshot({ path: 'artifacts/floor-world-desktop.png' });

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    Object.assign(save.state, { level: 5, width: 12, height: 10 });
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="floors"]').click();
  await shop.locator('[data-floor-id="warmWood"]').click();
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(state.coins).toBe(200);
  expect(state.width).toBe(12);
  expect(state.height).toBe(10);
  expect(state.activeFloorPattern).toBe('warmWood');
  await shop.locator('[data-floor-id="simpleTile"]').click();
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(state.coins).toBe(200);
  expect(state.activeFloorPattern).toBe('simpleTile');
  expect(state.ownedFloorPatterns).toEqual(['simpleTile', 'warmWood']);
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(state.activeFloorPattern).toBe('simpleTile');
  expect(errors).toEqual([]);
});

test('мобильный магазин имеет полноэкранные вкладки и крупные цели нажатия', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await expect(shop).toBeInViewport();
  await expect(shop).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const bounds = await shop.boundingBox();
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  for (const button of await shop.locator('.shop-tab, .shop-header button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="floors"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/floor-shop-mobile.png' });
});
