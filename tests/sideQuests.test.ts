import { describe, expect, it } from 'vitest';
import { SIDE_QUESTS } from '../src/content/sideQuests';
import { QUESTS } from '../src/content/quests';
import { processSideQuests } from '../src/simulation/questProgress';
import { createGame } from '../src/simulation/createGame';
import type { GameState } from '../src/simulation/types';

const quest = (id: string) => {
  const q = SIDE_QUESTS.find((x) => x.id === id);
  if (!q) throw new Error(`quest ${id} not found`);
  return q;
};

describe('SIDE_QUESTS структура', () => {
  it('1. содержит ровно 18 квестов с валидными полями', () => {
    expect(SIDE_QUESTS).toHaveLength(18);
    for (const q of SIDE_QUESTS) {
      expect(q.id).toBeTruthy();
      expect(q.title).toBeTruthy();
      expect(q.reward).toBeGreaterThan(0);
      expect(typeof q.test).toBe('function');
    }
  });

  it('2. dependsOn ссылается на существующий id (side или main)', () => {
    const sideIds = new Set(SIDE_QUESTS.map((q) => q.id));
    const mainIds = new Set(QUESTS.map((q) => q.id));
    for (const q of SIDE_QUESTS) {
      if (q.dependsOn) {
        expect(sideIds.has(q.dependsOn) || mainIds.has(q.dependsOn)).toBe(true);
      }
    }
  });
});

describe('baseline-семантика', () => {
  it('3. decor-painting: 1 applied > baseline.paintings', () => {
    const s = createGame();
    s.questBaseline.paintings = 0;
    s.appliedPaintings = [{ id: 'p1', paintingId: 'hills', side: 'north', index: 0 }];
    expect(quest('decor-painting').test(s)).toBe(true);
  });

  it('13. decor-painting НЕ выполнено при ретроактивном сейве (baseline=3)', () => {
    const s = createGame();
    s.questBaseline.paintings = 3;
    s.appliedPaintings = [
      { id: 'p1', paintingId: 'hills', side: 'north', index: 0 },
      { id: 'p2', paintingId: 'hills', side: 'north', index: 1 },
      { id: 'p3', paintingId: 'hills', side: 'north', index: 2 },
    ];
    expect(quest('decor-painting').test(s)).toBe(false);
  });

  it('6. economy-revenue: 5000 разницы от baseline', () => {
    const s = createGame();
    s.questBaseline.revenueTotal = 1000;
    s.revenueTotal = 6000;
    expect(quest('economy-revenue').test(s)).toBe(true);
  });
});

describe('абсолютные триггеры', () => {
  it('7. economy-savings: coins >= 10000 (baseline не влияет)', () => {
    const s = createGame();
    s.questBaseline.coins = 5000;
    s.coins = 10000;
    expect(quest('economy-savings').test(s)).toBe(true);
  });

  it('8. team-waiters-3: 3 официанта', () => {
    const s = createGame();
    s.employees = [1, 2, 3].map((i) => ({ id: `w${i}`, role: 'waiter' as const, position: { x: 0, y: 0 }, energy: 100 }));
    expect(quest('team-waiters-3').test(s)).toBe(true);
  });

  it('9. team-full-5: 5 официантов + 5 стоек', () => {
    const s = createGame();
    s.employees = [1, 2, 3, 4, 5].map((i) => ({ id: `w${i}`, role: 'waiter' as const, position: { x: 0, y: 0 }, energy: 100 }));
    s.furniture = [1, 2, 3, 4, 5].map((i) => ({ id: `c${i}`, kind: 'counter' as const, position: { x: i, y: 0 }, rotation: 0 as const }));
    expect(quest('team-full-5').test(s)).toBe(true);
  });

  it('10. menu-recipes-3: 3 рецепта', () => {
    const s = createGame();
    s.unlockedDishIds = ['soup', 'salad', 'pasta'];
    expect(quest('menu-recipes-3').test(s)).toBe(true);
  });

  it('11. peak-twenty: peakQuestTotals.servedTotal >= 20', () => {
    const s = createGame();
    s.peakQuestTotals.servedTotal = 20;
    expect(quest('peak-twenty').test(s)).toBe(true);
  });
});

describe('processSideQuests', () => {
  it('12. идемпотентность: награда зачисляется один раз', () => {
  const s = createGame();
  s.completedQuestIds = ['quest-1'];
  s.questBaseline.revenueTotal = 0;
  s.revenueTotal = 5000;
  processSideQuests(s);
  const coins1 = s.coins;
  const ids1 = [...s.completedSideQuestIds];
  processSideQuests(s);
  expect(s.coins).toBe(coins1);
  expect(s.completedSideQuestIds).toEqual(ids1);
});

  it('14. кап ×0.8: 3× woodWindow → 720, не 900', () => {
    const s = createGame();
    s.questBaseline.windows = 0;
    s.completedSideQuestIds = ['decor-painting']; // dependsOn bypass
    s.appliedWindows = [
      { id: 'w1', windowId: 'woodWindow', side: 'north', index: 0 },
      { id: 'w2', windowId: 'woodWindow', side: 'north', index: 1 },
      { id: 'w3', windowId: 'woodWindow', side: 'north', index: 2 },
    ];
    const before = s.coins;
    processSideQuests(s);
    expect(s.coins - before).toBe(720); // 3 × 300 × 0.8
  });

  it('5. decor-skins-5: 5 дорогих скинов → 2000', () => {
    const s = createGame();
    s.questBaseline.skins = 0;
    s.completedSideQuestIds = ['decor-painting', 'decor-skins-3'];
    s.ownedFurnitureSkins = ['royalTable', 'royalDouble', 'royalChair', 'vintageCounter', 'futureStove'];
    const before = s.coins;
    processSideQuests(s);
    expect(s.coins - before).toBe(2000); // cap не бьёт
  });
});