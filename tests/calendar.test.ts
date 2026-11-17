import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { calendarReward, calendarView, claimCalendarReward } from '../src/simulation/calendar';
import { normalizeState } from '../src/persistence/normalizeState';

describe('календарь наград', () => {
  it('содержит 30 наград от 100 до 1550 с шагом 50', () => {
    expect(Array.from({ length: 30 }, (_, index) => calendarReward(index))).toEqual(
      Array.from({ length: 30 }, (_, index) => 100 + 50 * index),
    );
  });

  it('запрещает повтор, продолжает завтра и сбрасывает после пропуска', () => {
    const state = createGame();
    expect(claimCalendarReward(state, '2026-11-15')).toMatchObject({ ok: true, reward: 100 });
    expect(state.coins).toBe(1100);
    expect(claimCalendarReward(state, '2026-11-15').ok).toBe(false);
    expect(state.coins).toBe(1100);
    expect(claimCalendarReward(state, '2026-11-16')).toMatchObject({ ok: true, reward: 150 });
    expect(claimCalendarReward(state, '2026-11-18')).toMatchObject({ ok: true, reward: 100 });
    expect(state.coins).toBe(1350);
  });

  it('начинает новый цикл после дня 30', () => {
    const state = createGame();
    state.calendar = { lastClaimDate: '2026-11-14', nextDayIndex: 29, cycle: 1 };
    expect(calendarView(state, '2026-11-15').availableIndex).toBe(29);
    expect(claimCalendarReward(state, '2026-11-15')).toMatchObject({ ok: true, reward: 1550 });
    expect(state.calendar).toEqual({ lastClaimDate: '2026-11-15', nextDayIndex: 0, cycle: 2 });
    expect(calendarView(state, '2026-11-16').availableIndex).toBe(0);
  });

  it('показывает сброс без изменения состояния при просмотре', () => {
    const state = createGame();
    state.calendar = { lastClaimDate: '2026-11-14', nextDayIndex: 4, cycle: 1 };
    const before = { ...state.calendar };
    const view = calendarView(state, '2026-11-16');
    expect(view.streakReset).toBe(true);
    expect(view.availableIndex).toBe(0);
    expect(state.calendar).toEqual(before);
  });

  it('мигрирует старую дату без повторной выдачи', () => {
    const legacy = createGame();
    legacy.lastDailyReward = '2026-11-15';
    normalizeState(legacy);
    expect(legacy.calendar.lastClaimDate).toBe('2026-11-15');
    expect(claimCalendarReward(legacy, '2026-11-15').ok).toBe(false);
    expect(legacy.coins).toBe(1000);
  });
});
