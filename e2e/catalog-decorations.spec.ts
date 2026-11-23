import { expect, test } from '@playwright/test';

const readState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!).state);

test('скин отдельного стула, картина и лояльность работают и переживают перезагрузку', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();

  // TECH-3: prevent side quest decor-painting from firing mid-test.
  // Otherwise it adds +200 coins non-deterministically between the painting
  // placement and the loyalty purchase, breaking the exact -200 delta at line 50.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.questBaseline.paintings = 1;
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="chairs"]').click();
  await expect(shop.getByRole('region', { name: 'Стулья', exact: true }).locator('[data-furniture-skin-id]')).toHaveCount(5);
  await shop.locator('[data-furniture-skin-id="oakChair"]').click();
  expect((await readState(page)).appliedFurnitureSkins).toHaveLength(1);
  expect((await readState(page)).appliedFurnitureSkins[0].skinId).toBe('oakChair');
  expect((await readState(page)).coins).toBe(925);

  await shop.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="equipment"]').click();
  await expect(shop.getByRole('region', { name: 'Оборудование', exact: true }).locator('[data-furniture-skin-id]')).toHaveCount(11);
  await shop.locator('[data-decoration-section="team"]').click();
  await expect(shop.getByRole('region', { name: 'Персонал', exact: true }).locator('[data-furniture-skin-id]')).toHaveCount(10);

  await shop.locator('[data-decoration-section="paintings"]').click();
  await expect(shop.locator('[data-painting-id]')).toHaveCount(5);
  await shop.locator('[data-painting-id="hills"]').click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  let state = await readState(page);
  expect(state.appliedPaintings).toHaveLength(1);
  expect(state.appliedPaintings[0].paintingId).toBe('hills');
  expect(state.coins).toBe(625);
  await page.screenshot({ path: 'artifacts/painting-world-desktop.png' });

  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-category="loyalty"]').click();
  await expect(shop.locator('[data-loyalty-id]')).toHaveCount(10);
  await expect(shop).toContainText('Общий бонус терпения: +0%');
  const coinsBeforeLoyalty = (await readState(page)).coins;
  await shop.locator('[data-loyalty-id="welcomeMint"]').click();
  state = await readState(page);
  expect(state.ownedLoyaltyItems).toEqual(['welcomeMint']);
  expect(state.toleranceBonus).toBe(5);
  expect(state.coins).toBe(coinsBeforeLoyalty - 200); // welcomeMint: price 200, coin bonus отсутствует
  await expect(shop.locator('[data-loyalty-id="welcomeMint"]')).toBeDisabled();
  await expect(shop).toContainText('Общий бонус терпения: +5%');

  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await readState(page);
  expect(state.appliedFurnitureSkins[0].skinId).toBe('oakChair');
  expect(state.appliedPaintings).toHaveLength(1);
  expect(state.ownedLoyaltyItems).toEqual(['welcomeMint']);

  let dialogs = 0;
  page.on('dialog', (dialog) => { dialogs += 1; void dialog.dismiss(); });
  await page.getByRole('button', { name: 'Обстановка', exact: true }).click();
  const editor = page.getByRole('complementary', { name: 'Редактор обстановки' });
  const paintingId = state.appliedPaintings[0].id;
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 770, y: 235 } });
  await expect(editor.locator(`[data-move-painting="${paintingId}"]`)).toBeVisible();
  const previousPainting = { ...state.appliedPaintings[0] };
  await editor.locator(`[data-move-painting="${paintingId}"]`).click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 850, y: 280 } });
  state = await readState(page);
  expect(state.appliedPaintings).toHaveLength(1);
  expect(`${state.appliedPaintings[0].side}-${state.appliedPaintings[0].index}`).not.toBe(`${previousPainting.side}-${previousPainting.index}`);
  const coinsBeforeRemoval = state.coins;
  await editor.locator(`[data-remove-painting="${paintingId}"]`).click();
  state = await readState(page);
  expect(state.appliedPaintings).toEqual([]);
  expect(state.coins).toBe(coinsBeforeRemoval + 150);
  expect(state.ownedPaintings).toEqual(['hills']);
  expect(dialogs).toBe(0);
  expect(errors).toEqual([]);
});

test('ореховый стол применяется ко всем столам и восстанавливается после перезагрузки', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('moy-restoran:primary') !== null, undefined, { timeout: 5000 });
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('moy-restoran:primary')!);
    save.state.level = 5;
    save.state.furniture.push({ id: 'table-walnut-check', kind: 'table', position: { x: 3, y: 4 }, rotation: 0 });
    localStorage.setItem('moy-restoran:primary', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="tables"]').click();
  await shop.locator('[data-furniture-skin-id="walnutTable"]').click();
  let state = await readState(page);
  expect(state.coins).toBe(700);
  expect(state.ownedFurnitureSkins).toContain('walnutTable');
  expect(state.firstPurchaseApplied).toContain('walnutTable');
  expect(state.appliedFurnitureSkins.filter((item: { skinId: string }) => item.skinId === 'walnutTable').map((item: { furnitureId: string }) => item.furnitureId).sort()).toEqual(['table-1', 'table-walnut-check']);
  await page.screenshot({ path: 'artifacts/walnut-tables-applied.png' });
  await shop.locator('[data-furniture-skin-id="walnutTable"]').click();
  await page.getByTestId('restaurant-canvas').locator('canvas').click({ position: { x: 592, y: 380 } });
  state = await readState(page);
  expect(state.coins).toBe(400);
  expect(state.appliedFurnitureSkins.filter((item: { skinId: string }) => item.skinId === 'walnutTable')).toHaveLength(2);
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  state = await readState(page);
  expect(state.appliedFurnitureSkins.filter((item: { skinId: string }) => item.skinId === 'walnutTable')).toHaveLength(2);
  await page.screenshot({ path: 'artifacts/walnut-tables-restored.png' });
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="tables"]').click();
  const entries = shop.locator('.shop-category--tables [data-shop-item], .shop-category--tables [data-reset-decoration]');
  await expect(entries.last()).toHaveAttribute('data-reset-decoration', 'tables');
  await expect(shop.locator('[data-reset-decoration="tables"]')).toBeHidden();
  const next = page.getByRole('button', { name: 'Следующая страница магазина' });
  while (await next.isEnabled()) await next.click();
  await shop.locator('[data-reset-decoration="tables"]').click();
  state = await readState(page);
  expect(state.coins).toBe(400);
  expect(state.appliedFurnitureSkins).toEqual([]);
  expect(errors).toEqual([]);
});

test('превью обоев, пола, картин и окон используют реальные текстуры и формы', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  for (const [section, selector] of [['wallpapers', '[data-wallpaper-id]'], ['floors', '[data-floor-id]'], ['paintings', '[data-painting-id]']] as const) {
    await shop.locator(`[data-decoration-section="${section}"]`).click();
    const images = shop.locator(`${selector} svg image`);
    await expect(images).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) await expect(images.nth(index)).toHaveAttribute('href', /^data:image\/png;base64,/);
    expect(await shop.locator(`${selector} svg`).evaluateAll((nodes) => nodes.some((node) => node.innerHTML.includes('undefined')))).toBe(false);
    await page.screenshot({ path: `artifacts/shop-preview-${section}.png` });
  }
  await shop.locator('[data-decoration-section="windows"]').click();
  await expect(shop.locator('[data-window-id="roundWindow"] svg circle')).toHaveCount(2);
  await expect(shop.locator('[data-window-id="archWindow"] svg path').first()).toHaveAttribute('d', /a/);
  await expect(shop.locator('[data-window-id="stainedWindow"] svg path')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/shop-preview-windows.png' });
});

test('все подкатегории декора доступны на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Магазин', exact: true }).click();
  const shop = page.getByRole('complementary', { name: 'Магазин ресторана' });
  await shop.locator('[data-shop-category="decorations"]').click();
  await shop.locator('[data-decoration-section="chairs"]').click();
  await expect(shop.getByRole('region', { name: 'Стулья', exact: true }).locator('[data-furniture-skin-id]')).toHaveCount(5);
  await expect(shop.locator('[data-furniture-skin-id="oakChair"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/catalog-shop-mobile.png' });
});
