import { patienceMultiplier } from './guestFlow';
import { recordPeakQueueRejected, recordPeakQueueTimeout } from './peak';
import type { Customer, GameState, Point } from './types';

export const QUEUE_LIMIT = 5;

function removeFromQueue(state: GameState, guest: Customer): void {
  state.guestQueue = state.guestQueue.filter((id) => id !== guest.id);
}

function applyQueuePenalty(state: GameState, guest: Customer, penalty: number): void {
  removeFromQueue(state, guest);
  state.popularity = Math.max(0, state.popularity - penalty);
  state.satisfiedStreak = 0;
  state.unhappyTotal += 1;
  guest.state = 'leaving';
  guest.seatId = undefined;
}

export function enqueueGuest(state: GameState, guest: Customer): boolean {
  state.guestQueue ??= [];
  if (state.guestQueue.length >= QUEUE_LIMIT) {
    applyQueuePenalty(state, guest, 10);
    state.queueRejectedTotal += 1;
    recordPeakQueueRejected(state);
    guest.target = { ...guest.position };
    return false;
  }
  guest.state = 'queueWaiting';
  guest.target = undefined;
  guest.seatId = undefined;
  guest.queueEnteredAt = state.tick;
  guest.queueWaitedTicks = 0;
  guest.queuePatience = 90 * patienceMultiplier(state);
  state.guestQueue.push(guest.id);
  return true;
}

export function advanceQueuedGuest(state: GameState, guest: Customer, exit: Point): boolean {
  guest.queueWaitedTicks = Math.max(0, guest.queueWaitedTicks ?? 0) + 1;
  const patience = Math.max(0, guest.queuePatience ?? 0);
  if (guest.queueWaitedTicks < patience) return true;

  const timeoutSteps = Math.floor(guest.queueWaitedTicks / Math.max(1, patience));
  applyQueuePenalty(state, guest, Math.min(50, 10 + 10 * timeoutSteps));
  state.queueTimeoutTotal += 1;
  recordPeakQueueTimeout(state);
  guest.target = exit;
  return false;
}

export function seatQueuedGuest(state: GameState, guest: Customer): boolean {
  if (!state.guestQueue.includes(guest.id)) return false;
  removeFromQueue(state, guest);
  state.queueSeatedTotal += 1;
  state.queueWaitTicksTotal += Math.max(0, guest.queueWaitedTicks ?? 0);
  guest.state = 'seekingSeat';
  return true;
}

const finiteCounter = (value: unknown): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;

export function normalizeQueueState(state: GameState): void {
  state.queueRejectedTotal = finiteCounter(state.queueRejectedTotal);
  state.queueTimeoutTotal = finiteCounter(state.queueTimeoutTotal);
  state.queueSeatedTotal = finiteCounter(state.queueSeatedTotal);
  state.queueWaitTicksTotal = finiteCounter(state.queueWaitTicksTotal);

  const queue: string[] = [];
  const queued = new Set<string>();
  for (const id of Array.isArray(state.guestQueue) ? state.guestQueue : []) {
    const guest = state.customers.find((customer) => customer.id === id);
    if (guest?.state === 'queueWaiting' && !queued.has(id) && queued.size < QUEUE_LIMIT) {
      queued.add(id);
      queue.push(id);
    }
  }
  const door = state.furniture.find((item) => item.kind === 'door')?.position ?? { x: 0, y: 0 };
  for (const guest of state.customers) {
    guest.queueEnteredAt = finiteCounter(guest.queueEnteredAt);
    guest.queueWaitedTicks = finiteCounter(guest.queueWaitedTicks);
    guest.queuePatience = Number.isFinite(guest.queuePatience)
      ? Math.max(0, guest.queuePatience as number)
      : guest.state === 'queueWaiting' ? 90 * patienceMultiplier(state) : 0;
    if (guest.state !== 'queueWaiting') continue;
    guest.seatId = undefined;
    guest.target = undefined;
    if (!queued.has(guest.id) && queued.size < QUEUE_LIMIT) {
      queued.add(guest.id);
      queue.push(guest.id);
    } else if (!queued.has(guest.id)) {
      guest.state = 'leaving';
      guest.target = { ...door };
    }
  }
  state.guestQueue = queue;
}
