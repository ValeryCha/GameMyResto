import { expect, test } from '@playwright/test';

const start = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
};

test('HUD сохраняет четыре показателя, панели выделяются, бейдж календаря исчезает после награды', async ({ page }) => {
  await start(page);
  await expect(page.locator('.hud-stat')).toHaveCount(4);
  await expect(page.getByTestId('hud-experience')).toBeVisible();
  await expect(page.getByTestId('hud-status')).not.toContainText('Премиум');
  const badge = page.locator('.hud-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('aria-hidden', 'true');

  const shopButton = page.getByRole('button', { name: 'Магазин', exact: true });
  await shopButton.click();
  await expect(shopButton).toHaveClass(/is-active/);
  await expect(page.locator('.hud-action.is-active')).toHaveCount(1);
  await page.getByRole('complementary', { name: 'Магазин ресторана' }).getByRole('button', { name: 'Закрыть' }).click();
  await expect(shopButton).not.toHaveClass(/is-active/);

  const progressButton = page.getByRole('button', { name: 'Прогресс', exact: true });
  await progressButton.click();
  await expect(progressButton).toHaveClass(/is-active/);
  await page.getByRole('complementary', { name: 'Прогресс ресторана' }).getByRole('button', { name: 'Закрыть' }).click();

  const editorButton = page.getByRole('button', { name: 'Обстановка', exact: true });
  await editorButton.click();
  await expect(editorButton).toHaveClass(/is-active/);
  await page.getByRole('button', { name: 'Вернуться в игру' }).click();
  await expect(editorButton).not.toHaveClass(/is-active/);

  await page.getByRole('button', { name: 'Календарь', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Календарь', exact: true })).toHaveClass(/is-active/);
  await page.locator('[data-calendar-claim]').click();
  await expect(badge).toBeHidden();
});

test('магазин листает адаптивные страницы, сбрасывает страницу при поиске и повторном открытии', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="recipes"]').click();
  const status = page.getByTestId('shop-page-status');
  const previous = page.getByRole('button', { name: 'Предыдущая страница магазина' });
  const next = page.getByRole('button', { name: 'Следующая страница магазина' });
  const visibleItems = shop.locator('.shop-category--recipes [data-shop-item]:visible');
  await expect(status).toHaveText('Страница 1 из 4');
  await expect(visibleItems).toHaveCount(10);
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(status).toHaveText('Страница 2 из 4');
  await expect(previous).toBeEnabled();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(status).toHaveText('Страница 2 из 6');
  await expect(visibleItems).toHaveCount(6);
  await page.getByRole('searchbox', { name: 'Поиск по магазину' }).fill('а');
  await expect(status).toHaveText(/Страница 1 из/);
  await page.getByRole('searchbox', { name: 'Поиск по магазину' }).fill('нет-такого-предмета');
  await expect(status).toHaveText('Страница 1 из 1');
  await expect(next).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Поиск по магазину' }).fill('');
  await next.click();
  await expect(status).toHaveText('Страница 2 из 6');
  await shop.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await expect(status).toHaveText('Страница 1 из 6');
  await shop.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);
  expect(saved.currentPage).toBeUndefined();
});

test('колесо и слайдер камеры синхронизированы, кнопка сброса находится под слайдером', async ({ page }) => {
  await start(page);
  const range = page.getByRole('slider', { name: 'Масштаб камеры' });
  const home = page.getByRole('button', { name: 'Сбросить вид' });
  await expect(range).toBeVisible();
  await expect(home).toBeVisible();
  await expect(page.getByRole('button', { name: 'Приблизить камеру' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Отдалить камеру' })).toHaveCount(0);
  const initial = Number(await range.inputValue());
  await page.getByTestId('restaurant-canvas').locator('canvas').hover();
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => Number(await range.inputValue())).toBeGreaterThan(initial);
  await range.evaluate((element: HTMLInputElement) => {
    element.value = '1.8';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(range).toHaveValue('1.8');
  await page.mouse.wheel(0, -120);
  await expect(range).toHaveValue('1.8');
  const rangeBounds = await range.boundingBox();
  const homeBounds = await home.boundingBox();
  expect(homeBounds!.y).toBeGreaterThanOrEqual(rangeBounds!.y + rangeBounds!.height);
  await home.click();
  expect(Number(await range.inputValue())).toBeLessThan(1.8);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(range).toBeHidden();
  await expect(home).toBeVisible();
});

test('угол карточки показывает только положительный склад мебели', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.furnitureInventory.table = 3;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await page.locator('[data-shop-category="hall"]').click();
  await expect(page.locator('[data-shop-item="table"] .shop-item__stock')).toHaveText('3');
  await expect(page.locator('[data-shop-item="chair"] .shop-item__stock')).toBeHidden();
});


test('скины персонала разделены по типам, карточки компактные и без внутренней прокрутки', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="team"]').click();
  const section = shop.locator('.shop-category--team');
  const status = page.getByTestId('shop-page-status');
  const chefs = ['classicChef', 'blackChef', 'goldChef', 'streetChef', 'pastryChef'];
  const waiters = ['classicWaiter', 'bowWaiter', 'apronWaiter', 'modernWaiter', 'retroWaiter'];

  await expect(status).toHaveText('Страница 1 из 2 · Повара');
  await expect(section.locator('[data-furniture-skin-id]:visible')).toHaveCount(5);
  for (const id of chefs) await expect(section.locator(`[data-furniture-skin-id="${id}"]`)).toBeVisible();
  for (const id of waiters) await expect(section.locator(`[data-furniture-skin-id="${id}"]`)).toBeHidden();
  await expect(section).not.toContainText('Первая покупка');
  expect(await section.evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible');
  expect(await section.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await page.screenshot({ path: 'artifacts/shop-compact-staff-chefs.png' });

  await page.getByRole('button', { name: 'Следующая страница магазина' }).click();
  await expect(status).toHaveText('Страница 2 из 2 · Официанты');
  for (const id of chefs) await expect(section.locator(`[data-furniture-skin-id="${id}"]`)).toBeHidden();
  for (const id of waiters) await expect(section.locator(`[data-furniture-skin-id="${id}"]`)).toBeVisible();

  await page.getByRole('button', { name: 'Предыдущая страница магазина' }).click();
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(status).toHaveText('Страница 1 из 2 · Повара');
  expect(await section.evaluate((element) => getComputedStyle(element).overflowY)).toBe('visible');
  expect(await section.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  const lastCard = await section.locator('[data-furniture-skin-id]:visible').last().boundingBox();
  const statusBox = await status.boundingBox();
  expect(lastCard!.y + lastCard!.height).toBeLessThanOrEqual(statusBox!.y);
  await page.screenshot({ path: 'artifacts/shop-compact-staff-mobile.png' });
});
