import { expect, test } from '@playwright/test';

test('HUD показывает FIFO-очередь и терпение первого гостя', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.waitForFunction(() => localStorage.getItem('moy-restoran:primary') !== null);
  await page.evaluate(() => {
    const key = 'moy-restoran:primary';
    const save = JSON.parse(localStorage.getItem(key)!);
    save.state.furniture = save.state.furniture.filter((item: { kind: string }) => !['chair', 'table'].includes(item.kind));
    save.state.customers = [];
    save.state.orders = [];
    save.state.guestQueue = [];
    save.state.queueRejectedTotal = 0;
    save.state.queueTimeoutTotal = 0;
    save.state.queueSeatedTotal = 0;
    save.state.queueWaitTicksTotal = 0;
    save.state.tick = 0;
    save.state.arrivalProgress = 1;
    save.state.peakState = { activePeakId: null, rewardedPeakIds: [], current: null, last: null };
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();

  const queue = page.getByTestId('guest-queue');
  await expect(queue).toBeVisible();
  await expect(queue).toContainText('Очередь: 1/5');
  await expect(queue).toContainText(/терпение первого: \d+ с/);
});
