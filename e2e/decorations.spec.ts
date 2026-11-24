import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) {
  test(`${mobile ? 'мобильный тап' : 'покупка и клик'}: поклеточные обои применяются и сохраняются`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Играть' }).click();
    await page.getByRole('button', { name: 'Магазин', exact: true }).click();
    const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
    await shop.locator('[data-shop-category="decorations"]').click();
    const decorations = shop.getByRole('region', { name: 'Обои', exact: true });
    await expect(decorations.locator('[data-wallpaper-id]')).toHaveCount(5);
    await decorations.locator('[data-wallpaper-id="creamStripes"]').click();
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
    expect(saved.coins).toBe(1000);
    expect(saved.appliedWallpapers).toEqual([]);
    await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: mobile ? { x: 235, y: 325 } : { x: 770, y: 235 } });
    await expect(page.getByRole('status').filter({ hasText: 'Обои наклеены · клетка 1×1' })).toBeVisible();
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
    expect(saved.coins).toBe(850);
    expect(saved.activeWallpaperId).toBe('creamStripes');
    expect(saved.ownedWallpapers.creamStripes).toBe(1);
    expect(saved.appliedWallpapers).toHaveLength(1);
    expect(saved.appliedWallpapers[0].wallpaperId).toBe('creamStripes');
    const appliedWallCellId = saved.appliedWallpapers[0].wallCellId;
    await page.screenshot({ path: `artifacts/decorations-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
      save.state.width = 12; save.state.height = 10; save.state.level = 5;
      localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Играть' }).click();
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
    expect(saved.activeWallpaperId).toBe('creamStripes');
    expect(saved.appliedWallpapers).toEqual(expect.arrayContaining([
      { wallCellId: appliedWallCellId, wallpaperId: 'creamStripes' },
    ]));
    expect(saved.appliedWallpapers.length).toBeGreaterThan(1);
    expect(saved.width).toBe(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (!mobile) {
      await page.getByRole('button', { name: 'Магазин', exact: true }).click();
      await shop.locator('[data-shop-category="decorations"]').click();
      await decorations.locator('[data-wallpaper-id="warmBrick"]').click();
      await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 904, y: 331 } });
      await expect(page.getByRole('status').filter({ hasText: 'Обои наклеены · клетка 1×1' })).toBeVisible();
      saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
      expect(saved.appliedWallpapers.some((item: { wallCellId: string }) => item.wallCellId === 'north-8')).toBe(true);
      await page.reload();
      await page.getByRole('button', { name: 'Играть' }).click();
      saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
      expect(saved.appliedWallpapers.some((item: { wallCellId: string }) => item.wallCellId === 'north-8')).toBe(true);
      await page.screenshot({ path: 'artifacts/decorations-expanded-wall.png' });
    }
    expect(errors).toEqual([]);
  });
}
