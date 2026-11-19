import type { GameState } from './types';
import { arrivalRate, capacity, isPeakHour } from './guestFlow';
import { throughputMetrics } from './throughput';
import { delayedOrders, kitchenLayoutWarnings } from './orderDiagnostics';

export type Bottleneck = 'seats' | 'kitchen' | 'service' | 'balanced';

export function upgradeHint(state: GameState): { bottleneck: Bottleneck; text: string } {
  const metrics = throughputMetrics(state);
  const minimum = Math.min(metrics.kitchenRate, metrics.serviceRate, metrics.seatRate);
  if (metrics.seatRate === minimum) {
    return { bottleneck: 'seats', text: 'Узкое звено — места: добавьте стул рядом со столом' };
  }
  if (metrics.kitchenRate === minimum) {
    const chefs = state.employees.filter((employee) => employee.role === 'chef').length;
    const stoves = state.furniture.filter((item) => item.kind === 'stove').length;
    const action = chefs === 0 ? 'нужен повар' : stoves === 0 ? 'нужна плита' : 'прокачайте кухню';
    return { bottleneck: 'kitchen', text: `Узкое звено — кухня: ${action}` };
  }
  if (metrics.serviceRate === minimum) {
    const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
    const counters = state.furniture.filter((item) => item.kind === 'counter').length;
    const action = waiters === 0 ? 'купите официанта' : counters === 0 ? 'купите стойку выдачи' : waiters <= counters ? 'купите официанта' : 'купите стойку выдачи';
    return { bottleneck: 'service', text: `Узкое звено — выдача: ${action}` };
  }
  return { bottleneck: 'balanced', text: 'Все звенья сбалансированы' };
}

export function getHudModel(state: GameState) {
  const phase = ((state.tick % 180) + 180) % 180;
  const metrics = throughputMetrics(state);
  const previous = [...state.ratingHistory].reverse().find((point) => point.tick <= state.tick - 60);
  const ratingDelta = previous ? state.popularity - previous.value : 0;
  const ratingTrend = ratingDelta > 1 ? '↑' : ratingDelta < -1 ? '↓' : '→';
  const ratingReason = !previous ? 'нужно 60 тиков для сравнения'
    : ratingDelta > 1 ? 'рост от обслуживания и декора'
      : ratingDelta < -1 ? 'снижение из-за недовольных гостей' : 'без заметных изменений';
  return {
    coins: state.coins,
    experience: state.experience,
    level: state.level,
    popularity: String(Math.round(state.popularity)),
    ratingDelta: Math.round(ratingDelta),
    ratingTrend,
    ratingReason,
    guests: state.customers.length,
    occupiedSeats: new Set(state.customers.map((guest) => guest.seatId).filter(Boolean)).size,
    capacity: capacity(state),
    queue: state.guestQueue.length,
    arrivalsPer60: arrivalRate(state) * 60,
    throughputPer60: metrics.throughput * 60,
    kitchenPer60: metrics.kitchenRate * 60,
    servicePer60: metrics.serviceRate * 60,
    seatsPer60: metrics.seatRate * 60,
    team: {
      waiters: state.employees.filter((employee) => employee.role === 'waiter').length,
      counters: state.furniture.filter((item) => item.kind === 'counter').length,
      chefs: state.employees.filter((employee) => employee.role === 'chef').length,
      stoves: state.furniture.filter((item) => item.kind === 'stove').length,
    },
    upgrade: upgradeHint(state),
    diagnostics: delayedOrders(state),
    kitchenWarnings: kitchenLayoutWarnings(state),
    peak: isPeakHour(state.tick),
    peakRemaining: phase < 60 ? 60 - phase : 180 - phase,
  };
}
