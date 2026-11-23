import { test, expect } from '@playwright/test';

type SaveFile = { state: Record<string, unknown> };

async function readSave(page: import('@playwright/test').Page): Promise<SaveFile> {
  await page.waitForFunction(() => localStorage.getItem('moy-restoran:primary') !== null);
  return page.evaluate(() => JSON.parse(localStorage.getItem('moy-restoran:primary')!));
}

async function patchSave(
  page: import('@playwright/test').Page,
  patch: (state: Record<string, unknown>) => void,
): Promise<void> {
  const save = await readSave(page);
  patch(save.state);
  await page.evaluate((s) => {
    localStorage.setItem('moy-restoran:primary', JSON.stringify(s));
  }, save);
  await page.reload();
}

test.describe('LOGIC-6.3 — lifecycle квестов', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Играть' }).click();
  });

  test('1. главный quest-1 → side economy-revenue разблокируется', async ({ page }) => {
    // До: economy-revenue заблокирован (dependsOn quest-1 не выполнен)
    await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
    const panel = page.getByRole('complementary', { name: 'Прогресс ресторана' });
    const economy = panel.locator('.side-quest-item').filter({ hasText: 'Заработайте 5000 монет с блюд' });
    await expect(economy).toHaveClass(/is-locked/);

    // Патчим: quest-1 выполнен (через completedQuestIds — так делает processProgression)
    await patchSave(page, (state) => {
      const completed = (state.completedQuestIds as string[]) ?? [];
      if (!completed.includes('quest-1')) completed.push('quest-1');
      state.completedQuestIds = completed;
    });

    // После reload + несколько тиков processProgression вызовется, экономика разблокируется
    await page.getByRole('button', { name: 'Играть' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Прогресс', exact: true }).click();
    const economyAfter = page.getByRole('complementary', { name: 'Прогресс ресторана' })
      .locator('.side-quest-item').filter({ hasText: 'Заработайте 5000 монет с блюд' });
    await expect(economyAfter).not.toHaveClass(/is-locked/);
  });

  test('2. daily идемпотентен: rewarded=true → повторно не начисляется', async ({ page }) => {
    const before = await readSave(page);
    const coinsBefore = before.state.coins as number;
    const today = new Date().toISOString().slice(0, 10);
    const dailyId = (before.state.dailyQuestState as { id: string }).id;
    const dailyReward = 150; // daily-serve-5 → rewardCoins 150, но проверим без допущений:

    // Патчим: daily уже выполнен (rewarded: true)
    await patchSave(page, (state) => {
      state.dailyQuestState = {
        date: today,
        id: dailyId,
        progress: 999,
        rewarded: true,
      };
    });

    await page.getByRole('button', { name: 'Играть' }).click();
    await page.waitForTimeout(800); // несколько тиков

    const after = await readSave(page);
    const coinsAfter = after.state.coins as number;
    // Награда не должна быть начислена повторно.
    // Допускаем только положительные изменения от других источников (пик/апгрейд),
    // но не скачок на dailyReward при уже rewarded=true.
    // Проверка: dailyQuestState.rewarded остаётся true, награда не удвоена
    expect((after.state.dailyQuestState as { rewarded: boolean }).rewarded).toBe(true);
    // Основной ассерт: если бы произошло повторное начисление, coins вырос бы на dailyReward
    // (при отсутствии других источников). Допуск на мелкие тики:
    expect(coinsAfter - coinsBefore).toBeLessThan(dailyReward);
  });

  test('3. side quest: награда один раз при повторном processSideQuests', async ({ page }) => {
  // Очистка: пустой completed side, baseline.paintings = 0
  await patchSave(page, (state) => {
    state.completedSideQuestIds = [];
    state.appliedPaintings = [];
    state.questBaseline = {
      ...(state.questBaseline as Record<string, number>),
      paintings: 0,
    };
  });

  await page.getByRole('button', { name: 'Играть' }).click();
  await page.waitForTimeout(800);

  const before = await readSave(page);
  const coinsBefore = before.state.coins as number;

  // Размещаем картину → processProgression → processSideQuests должен выполнить decor-painting
  await patchSave(page, (state) => {
    state.appliedPaintings = [
      { id: 'p1', paintingId: 'hills', side: 'north', index: 0 },
    ];
  });

  await page.getByRole('button', { name: 'Играть' }).click();
  // Ждём ЦЕЛЕВОЕ состояние, а не tick
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('moy-restoran:primary');
      if (!raw) return false;
      const state = JSON.parse(raw).state;
      return (state.completedSideQuestIds as string[]).includes('decor-painting');
    },
    { timeout: 15000 },
  );

  const afterFirst = await readSave(page);
  const coinsFirst = afterFirst.state.coins as number;
  const completedFirst = afterFirst.state.completedSideQuestIds as string[];
  expect(completedFirst).toContain('decor-painting');
  // Награда начислена (200 или cap ×0.8 от hills=300 → 200; допуск на другие источники)
  expect(coinsFirst - coinsBefore).toBeGreaterThanOrEqual(100);

  // Повторный reload — processSideQuests не должен начислять ещё раз
  await page.reload();
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.waitForTimeout(1500);

  const afterSecond = await readSave(page);
  const coinsSecond = afterSecond.state.coins as number;
  const completedSecond = afterSecond.state.completedSideQuestIds as string[];
  expect(completedSecond).toContain('decor-painting');
  // Награда не удвоилась (200 + 200 = 400 — не должно; допуск 150 на мелкие тики)
  expect(coinsSecond - coinsFirst).toBeLessThan(150);
  });
});