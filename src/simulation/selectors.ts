import type { GameState } from './types';
import { arrivalRate, capacity, isPeakHour } from './guestFlow';

export function getHudModel(state: GameState) {
  const phase = ((state.tick % 180) + 180) % 180;
  return {
    coins: state.coins,
    experience: state.experience,
    level: state.level,
    popularity: String(Math.round(state.popularity)),
    guests: state.customers.length,
    capacity: capacity(state),
    arrivalsPer60: arrivalRate(state) * 60,
    peak: isPeakHour(state.tick),
    peakRemaining: phase < 60 ? 60 - phase : 180 - phase,
  };
}
