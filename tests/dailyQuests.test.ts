import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DAILY_QUESTS } from '../src/content/dailyQuests';
import { selectDailyQuest, processDailyQuest, recordPeakTotals } from '../src/simulation/questProgress';
import { createGame } from '../src/simulation/createGame';

describe('Daily Quests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. DAILY_QUESTS содержит ровно 6 квестов', () => {
    expect(DAILY_QUESTS).toHaveLength(6);
  });

  it('2. progress(state) возвращает число для каждого', () => {
    const s = createGame();
    for (const q of DAILY_QUESTS) {
      expect(typeof q.progress(s)).toBe('number');
    }
  });

  it('3. selectDailyQuest детерминирован по date+seed', () => {
    const s1 = createGame();
    s1.randomSeed = 42;
    selectDailyQuest(s1);

    const s2 = createGame();
    s2.randomSeed = 42;
    selectDailyQuest(s2);

    expect(s1.dailyQuestState.id).toBe(s2.dailyQuestState.id);
    expect(s1.dailyQuestState.date).toBe('2026-11-20');
  });

  it('4. selectDailyQuest идемпотентен (один день — один стейт)', () => {
    const s = createGame();
    selectDailyQuest(s);
    const firstState = { ...s.dailyQuestState };

    selectDailyQuest(s);
    expect(s.dailyQuestState).toEqual(firstState);
  });

  it('5. selectDailyQuest в новый день сбрасывает прогресс', () => {
    const s = createGame();
    selectDailyQuest(s);
    s.dailyQuestState.rewarded = true;

    // Эмулируем следующий день
    vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
    selectDailyQuest(s);

    expect(s.dailyQuestState.date).toBe('2026-11-21');
    expect(s.dailyQuestState.rewarded).toBe(false);
    // прогресс должен быть инициализирован текущим значением (baseline)
    const quest = DAILY_QUESTS.find(q => q.id === s.dailyQuestState.id)!;
    expect(s.dailyQuestState.progress).toBe(quest.progress(s));
  });

  it('6. processDailyQuest начисляет награду при достижении цели', () => {
    const s = createGame();
    selectDailyQuest(s);
    const quest = DAILY_QUESTS.find(q => q.id === s.dailyQuestState.id)!;
    const coinsBefore = s.coins;

    // Искусственно откручиваем baseline назад, чтобы delta >= target
    s.dailyQuestState.progress = quest.progress(s) - quest.target;

    processDailyQuest(s);
    expect(s.dailyQuestState.rewarded).toBe(true);
    expect(s.coins).toBe(coinsBefore + quest.rewardCoins);
    expect(s.experience).toBe(quest.rewardXp);
  });

  it('7. processDailyQuest идемпотентен (награда только 1 раз)', () => {
    const s = createGame();
    selectDailyQuest(s);
    const quest = DAILY_QUESTS.find(q => q.id === s.dailyQuestState.id)!;
    s.dailyQuestState.progress = quest.progress(s) - quest.target;

    processDailyQuest(s);
    const coinsAfterFirst = s.coins;

    processDailyQuest(s);
    expect(s.coins).toBe(coinsAfterFirst);
  });

  it('8. recordPeakTotals инкрементирует servedTotal', () => {
    const s = createGame();
    s.peakQuestTotals.servedTotal = 0;
    recordPeakTotals(s, 5);
    expect(s.peakQuestTotals.servedTotal).toBe(5);
  });

  it('9. recordPeakTotals не трогает другие поля state', () => {
    const s = createGame();
    s.peakQuestTotals.servedTotal = 0;
    const coins = s.coins;
    recordPeakTotals(s, 5);
    expect(s.coins).toBe(coins);
  });

  it('10. processDailyQuest не трогает baseline и side quests', () => {
    const s = createGame();
    selectDailyQuest(s);
    const sideIds = [...s.completedSideQuestIds];
    processDailyQuest(s);
    expect(s.completedSideQuestIds).toEqual(sideIds);
  });
});