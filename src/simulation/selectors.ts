import type { GameState } from './types';
import { isPeakHour, targetGuestCount } from './guestFlow';

export function getHudModel(state: GameState) {
  const phase = ((state.tick % 180) + 180) % 180;
  return {
    coins: state.coins,
    experience: state.experience,
    level: state.level,
    popularity: state.popularity.toFixed(1),
    guests: state.customers.length,
    targetGuests: targetGuestCount(state),
    guestLimit: state.guestLimit,
    peak: isPeakHour(state.tick),
    peakRemaining: phase < 60 ? 60 - phase : 180 - phase,
  };
}
