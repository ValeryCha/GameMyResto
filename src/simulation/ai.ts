import { nextRandom } from './random';
import { findSeat } from './seating';
import type { Customer, GameState } from './types';

export type GuestAction = 'seat' | 'wander' | 'inspect' | 'order' | 'eat' | 'leave';

export function chooseGuestAction(state: GameState, guest: Customer): GuestAction {
  if (guest.patience <= 0 || guest.state === 'leaving') return 'leave';
  if (guest.state === 'ordering') return 'order';
  if (guest.state === 'eating') return 'eat';
  const hasFreeSeat = Boolean(guest.seatId || findSeat(state, guest));
  if (hasFreeSeat && guest.state !== 'waitingFood') return 'seat';
  if (guest.state === 'waitingFood') return 'wander';
  return nextRandom(state) < 0.5 ? 'wander' : 'inspect';
}
