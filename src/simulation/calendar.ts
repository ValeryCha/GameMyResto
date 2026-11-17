import type { CommandResult, GameState } from './types';

export interface CalendarView {
  availableIndex: number;
  claimedCount: number;
  claimedToday: boolean;
  streakReset: boolean;
  cycle: number;
}

export const calendarReward = (dayIndex: number): number => 100 + 50 * dayIndex;
const dayNumber = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);

export function calendarView(state: GameState, today: string): CalendarView {
  const calendar = state.calendar;
  if (calendar.lastClaimDate === today) {
    return { availableIndex: -1, claimedCount: calendar.nextDayIndex, claimedToday: true, streakReset: false, cycle: calendar.cycle };
  }
  const gap = calendar.lastClaimDate ? dayNumber(today) - dayNumber(calendar.lastClaimDate) : 0;
  const continuing = Boolean(calendar.lastClaimDate) && gap === 1;
  const availableIndex = continuing ? calendar.nextDayIndex : 0;
  return {
    availableIndex,
    claimedCount: availableIndex,
    claimedToday: false,
    streakReset: Boolean(calendar.lastClaimDate) && !continuing,
    cycle: calendar.cycle,
  };
}

export function claimCalendarReward(state: GameState, today: string): CommandResult & { reward?: number } {
  if (state.calendar.lastClaimDate === today) return { ok: false, reason: 'Награда сегодня уже получена' };
  const view = calendarView(state, today);
  const index = view.availableIndex;
  if (index < 0) return { ok: false, reason: 'Награда сегодня уже получена' };
  const reward = calendarReward(index);
  state.coins += reward;
  state.calendar.lastClaimDate = today;
  state.calendar.nextDayIndex = (index + 1) % 30;
  if (index === 29) state.calendar.cycle += 1;
  state.lastDailyReward = today;
  return { ok: true, reward };
}
