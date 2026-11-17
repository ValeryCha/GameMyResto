import { expect, test } from '@playwright/test';

const readState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);

test('все основные панели управляются иконками, а 33 уровень сохраняется', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Играть' }).locator('svg')).toBeVisible();
  await page.getByRole('button', { name: 'Играть' }).click();
  for (const name of ['Магазин', 'Обстановка', 'Прогресс', 'Календарь', 'Меню']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button.locator('svg')).toBeVisible();
    await expect(button.locator('.sr-only')).toHaveText(name);
  }
  await page.screenshot({ path: 'artifacts/icon-hud-desktop.png' });

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await expect(shop).toHaveClass(/is-open/);
  await expect(shop.locator('.shop-tab')).toHaveCount(6);
  await shop.locator('[data-shop-category="decorations"]').click();
  await expect(shop.locator('.shop-subtabs button')).toHaveCount(9);
  await expect(shop.locator('.shop-subtabs button svg')).toHaveCount(9);
  await page.screenshot({ path: 'artifacts/icon-shop-desktop.png' });
  await shop.getByRole('button', { name: 'Закрыть' }).click();

  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  const progress = page.getByRole('complementary', { name: 'Прогресс ресторана' });
  await expect(progress).toHaveClass(/is-open/);
  await page.screenshot({ path: 'artifacts/icon-progress-desktop.png' });
  await progress.getByRole('button', { name: 'Закрыть' }).click();

  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  const calendar = page.getByRole('complementary', { name: 'Календарь наград' });
  await calendar.locator('[data-calendar-claim]').click();
  expect((await readState(page)).coins).toBe(1100);
  await calendar.getByRole('button', { name: 'Закрыть' }).click();

  await page.getByRole('button', { name: 'Обстановка', exact: true }).click();
  const editor = page.getByRole('complementary', { name: 'Редактор обстановки' });
  await expect(editor).toBeVisible();
  await expect(editor.locator('button svg')).toHaveCount(9);
  await editor.getByRole('button', { name: 'Вернуться в игру' }).click();

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.level = 33;
    save.state.experience = 0;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  expect((await readState(page)).level).toBe(33);
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
  await expect(progress).toContainText('Уровень 33 — максимум');
  await progress.getByRole('button', { name: 'Закрыть' }).click();
  expect(errors).toEqual([]);
});

test('HUD и ценники не перекрываются и не обрезаются на ширине 360 и 768 пикселей', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const statusBounds = await page.getByTestId('hud-status').boundingBox();
    const experienceBounds = await page.getByTestId('hud-experience').boundingBox();
    expect(experienceBounds!.y).toBe(0);
    expect(experienceBounds!.y + experienceBounds!.height).toBeLessThanOrEqual(statusBounds!.y);
    expect(statusBounds!.y + statusBounds!.height).toBeLessThanOrEqual(900 * 0.15);
    if (width === 360) {
      for (const name of ['Магазин', 'Обстановка', 'Прогресс', 'Календарь', 'Меню']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        expect(bounds?.width).toBeGreaterThanOrEqual(44);
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/icon-hud-${width}.png` });
    await page.getByRole('button', { name: 'Магазин', exact: true }).click();
    const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
    await shop.locator('[data-shop-category="decorations"]').click();
    const checkPrices = async () => {
      const clippedPrices = await shop.locator('.shop-category--wallpapers [data-shop-item]:visible').evaluateAll((items) => items.filter((item) => {
        const price = item.querySelector('.shop-item__price');
        if (!price) return false;
        const itemBox = item.getBoundingClientRect();
        const priceBox = price.getBoundingClientRect();
        return priceBox.left < itemBox.left || priceBox.right > itemBox.right || priceBox.bottom > itemBox.bottom
          || price.scrollWidth > price.clientWidth || price.scrollHeight > price.clientHeight;
      }).map((item) => item.getAttribute('data-shop-item')));
      expect(clippedPrices).toEqual([]);
    };
    await checkPrices();
    await page.screenshot({ path: `artifacts/icon-shop-${width}-first.png` });
    const next = page.getByRole('button', { name: 'Следующая страница магазина' });
    if (await next.isEnabled()) {
      await next.click();
      await checkPrices();
      await page.screenshot({ path: `artifacts/icon-shop-${width}-last.png` });
    }
    await shop.getByRole('button', { name: 'Закрыть' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
