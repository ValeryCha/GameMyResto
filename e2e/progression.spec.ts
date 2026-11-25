import { expect, test } from '@playwright/test';

test('уровень бесплатно расширяет ресторан и сохраняется', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const key = 'moy-restoran:primary';
    const save = JSON.parse(localStorage.getItem(key)!);
    save.state.experience = 1799;
    save.state.appliedWallpapers = [{ wallCellId: 'north-7', wallpaperId: 'creamStripes' }];
    save.state.activeWallpaperId = 'creamStripes';
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.waitForFunction(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary') || 'null');
    if (!save) return false;
    const ids = (save.state.appliedWallpapers || []).map((w: { wallCellId: string }) => w.wallCellId);
    return ids.includes('north-8') && ids.includes('north-9');
  }, undefined, { timeout: 15000 });
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  const expanded = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(expanded.appliedWallpapers).toEqual(expect.arrayContaining([
    { wallCellId: 'north-8', wallpaperId: 'creamStripes' },
    { wallCellId: 'north-9', wallpaperId: 'creamStripes' },
  ]));
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/restaurant-progression-mobile.png' });
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const progress = page.getByLabel('Прогресс ресторана');
  await expect(progress).toContainText('Уровень 5');
  await expect(progress).toContainText('1799 / 1800 опыта');
  await expect(progress.locator('.quest-item.is-active')).toContainText('Больше столиков');
  await expect(progress.locator('.quest-item.is-active')).toContainText('1500 монет');
  await expect(page.getByRole('button', { name: 'Магазин', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Состояние гостей' })).toHaveCount(0);
});
