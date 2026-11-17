import { expect, test } from '@playwright/test';

test('HUD отдельно показывает статистику пика и предупреждение с лимитирующим звеном', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  const banner = page.getByTestId('peak-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/Пик: \d+ с · обслужено \d+ · недовольных \d+/);
  await expect(page.locator('.hud-toast')).toBeHidden();

  await page.getByRole('button', { name: 'Меню', exact: true }).click();
  await page.evaluate(() => {
    const key = 'moy-restoran:primary';
    const save = JSON.parse(localStorage.getItem(key)!);
    save.state.tick = 169;
    save.state.spawnProgress = -10_000;
    save.state.peakState = { activePeakId: null, rewardedPeakIds: [], current: null, last: null };
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await expect(banner).toContainText('Пик через 10');
  await expect(banner).toContainText('лимитирует:');
  await expect(page.getByTestId('peak-result')).toBeHidden();
});
