import { countUsableSeats, isPeakHour } from './guestFlow';
import { kitchenRate } from './throughput';
import type { GameState, PeakResult, PeakStats } from './types';
import { recordPeakTotals } from './questProgress';

export const PEAK_CYCLE_TICKS = 180;
export const PEAK_DURATION_TICKS = 60;
export const PEAK_WARNING_TICKS = 10;
export const PEAK_TIP_FACTOR = 1.5;

const finiteCounter = (value: unknown): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;

export function emptyPeakStats(startedAtTick: number, carriedIn = 0): PeakStats {
  return {
    startedAtTick,
    arrived: 0,
    seated: 0,
    served: 0,
    unhappy: 0,
    queueRejected: 0,
    queueTimeout: 0,
    revenue: 0,
    bonusCoins: 0,
    carriedIn: finiteCounter(carriedIn),
  };
}

function activeGuests(state: GameState): number {
  return state.customers.filter((guest) => guest.state !== 'leaving').length;
}

function peakIdAt(tick: number): number {
  return Math.floor(tick / PEAK_CYCLE_TICKS);
}

export function beginPeak(state: GameState): void {
  if (!isPeakHour(state.tick)) return;
  const peakId = peakIdAt(state.tick);
  if (state.peakState.activePeakId === peakId && state.peakState.current) return;
  state.peakState.activePeakId = peakId;
  state.peakState.current = emptyPeakStats(state.tick, activeGuests(state));
}

export function finishPeak(state: GameState): PeakResult | null {
  const current = state.peakState.current;
  const peakId = state.peakState.activePeakId;
  if (!current || peakId === null || isPeakHour(state.tick)) return null;

  const peakGuests = current.arrived + current.carriedIn;
  const serviceRatio = current.served / Math.max(1, current.served + current.unhappy);
  const completion = (current.served + current.unhappy) / Math.max(1, peakGuests);
  let bonusCoins = 0;
  let bonusXP = 0;
  if (serviceRatio >= 0.9 && current.queueRejected + current.queueTimeout === 0 && current.served >= 5) {
    bonusCoins = 500 + 100 * state.level;
    bonusXP = 50;
  } else if (serviceRatio >= 0.75 && current.served >= 3) {
    bonusCoins = 250 + 50 * state.level;
    bonusXP = 20;
  }

  const result: PeakResult = {
    ...current,
    peakId,
    serviceRatio,
    completion,
    bonusCoins,
    bonusXP,
    perfect: peakGuests >= 5 && current.unhappy === 0 &&
      current.queueRejected === 0 && current.queueTimeout === 0,
  };
  state.peakState.last = result;
  state.peakState.current = null;
  state.peakState.activePeakId = null;
  recordPeakTotals(state, result.served);
  if (result.perfect) {
    state.peakQuestTotals.perfectPeaksTotal = (state.peakQuestTotals.perfectPeaksTotal ?? 0) + 1;
  }
  if (!state.peakState.rewardedPeakIds.includes(peakId)) {
    state.coins += bonusCoins;
    state.experience += bonusXP;
    state.peakState.rewardedPeakIds.push(peakId);
    state.peakState.rewardedPeakIds = state.peakState.rewardedPeakIds.slice(-30);
  }
  return result;
}

export function recordPeakArrival(state: GameState): void {
  if (state.peakState.current) state.peakState.current.arrived += 1;
}

export function recordPeakSeated(state: GameState): void {
  if (state.peakState.current) state.peakState.current.seated += 1;
}

export function recordPeakUnhappy(state: GameState): void {
  if (state.peakState.current) state.peakState.current.unhappy += 1;
}

export function recordPeakQueueRejected(state: GameState): void {
  recordPeakUnhappy(state);
  if (state.peakState.current) state.peakState.current.queueRejected += 1;
}

export function recordPeakQueueTimeout(state: GameState): void {
  recordPeakUnhappy(state);
  if (state.peakState.current) state.peakState.current.queueTimeout += 1;
}

export function recordPeakService(state: GameState, revenue: number): void {
  if (!state.peakState.current) return;
  state.peakState.current.served += 1;
  state.peakState.current.revenue += revenue;
}

export function peakTipMultiplier(state: GameState): number {
  return isPeakHour(state.tick) ? PEAK_TIP_FACTOR : 1;
}

export function peakBottleneck(state: GameState): 'места' | 'кухня' | 'доставка' {
  const kitchen = kitchenRate(state);
  const waiters = Math.min(5, state.employees.filter((employee) => employee.role === 'waiter').length);
  const counters = Math.min(5, state.furniture.filter((item) => item.kind === 'counter').length);
  const serviceRate = 0.92 * Math.min(waiters, counters) /
    (10 * (1 - 0.07 * state.upgrades.waiter));
  const seatRate = countUsableSeats(state) /
    (10 / Math.max(1, Math.min(waiters, counters)) + 8);

  if (seatRate <= kitchen && seatRate <= serviceRate) return 'места';
  if (kitchen <= serviceRate) return 'кухня';
  return 'доставка';
}

export function normalizePeakState(state: GameState): void {
  const saved = state.peakState;
  const rewardedPeakIds = Array.isArray(saved?.rewardedPeakIds)
    ? [...new Set(saved.rewardedPeakIds.filter((id) => Number.isInteger(id) && id >= 0))].slice(-30)
    : [];
  state.peakState = {
    activePeakId: null,
    rewardedPeakIds,
    current: null,
    last: saved?.last ?? null,
  };
  if (isPeakHour(state.tick)) beginPeak(state);
}
