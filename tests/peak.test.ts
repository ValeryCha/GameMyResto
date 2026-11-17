import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation } from '../src/simulation/tick';
import { beginPeak, finishPeak, peakBottleneck, peakTipMultiplier } from '../src/simulation/peak';
import { paymentFor, settleOrder } from '../src/simulation/orders';
import { DISHES } from '../src/content/dishes';
import { normalizeState } from '../src/persistence/normalizeState';
import type { GameState } from '../src/simulation/types';

function finishWith(state: GameState, values: Partial<GameState['peakState']['current']>) {
  Object.assign(state.peakState.current!, values);
  state.tick += 59;
  return finishPeak(state)!;
}

describe('пиковый час', () => {
  it('начинается на первом тике, длится 60 тиков и повторяется через 180', () => {
    const state = createGame();
    advanceSimulation(state, 1);
    expect(state.peakState.activePeakId).toBe(0);
    expect(state.peakState.current?.startedAtTick).toBe(1);
    expect(state.peakState.current?.arrived).toBe(1);

    advanceSimulation(state, 58);
    expect(state.peakState.current).not.toBeNull();
    advanceSimulation(state, 1);
    expect(state.tick).toBe(60);
    expect(state.peakState.current).toBeNull();
    expect(state.peakState.last?.peakId).toBe(0);

    advanceSimulation(state, 120);
    expect(state.tick).toBe(180);
    expect(state.peakState.activePeakId).toBe(1);
    expect(state.peakState.current?.startedAtTick).toBe(180);
  });

  it('применяет ×1.5 только к текущему множителю чаевых и один раз', () => {
    const state = createGame();
    state.popularity = 50;
    state.tick = 100;
    const regular = paymentFor(state, DISHES[0], false);
    expect(regular).toBe(Math.round(DISHES[0].price * 1.1));
    state.tick = 1;
    beginPeak(state);
    expect(paymentFor(state, DISHES[0], false)).toBe(Math.round(DISHES[0].price * 1.1 * 1.5));
    state.tick = 60;
    finishPeak(state);
    expect(paymentFor(state, DISHES[0], false)).toBe(regular);
    for (const [tick, factor] of [[0, 1.5], [59, 1.5], [60, 1], [179, 1], [180, 1.5]] as const) {
      state.tick = tick;
      expect(peakTipMultiplier(state)).toBe(factor);
    }
  });

  it.each([60, 240, 420])('не умножает чаевые при расчёте на граничном тике %i вне пика', (tick) => {
    const state = createGame();
    state.popularity = 50;
    state.tick = tick;
    state.peakState.activePeakId = Math.floor((tick - 1) / 180);
    state.peakState.current = {
      startedAtTick: tick - 59,
      arrived: 1,
      seated: 1,
      served: 0,
      unhappy: 0,
      queueRejected: 0,
      queueTimeout: 0,
      revenue: 0,
      bonusCoins: 0,
      carriedIn: 0,
    };
    const guest = { id: `guest-${tick}`, position: { x: 5, y: 5 }, state: 'eating' as const, patience: 100 };
    const order = { id: `order-${tick}`, customerId: guest.id, state: 'delivered' as const, progress: 8, dishId: 'soup' };
    expect(settleOrder(state, guest, order)).toBe(Math.round(DISHES[0].price * 1.1));
  });

  it('не считает приход, если занятая клетка входа не позволила создать гостя', () => {
    const state = createGame();
    state.employees[0].position = { x: 0, y: 7 };
    advanceSimulation(state, 1);
    expect(state.customers).toHaveLength(0);
    expect(state.peakState.current?.arrived).toBe(0);
  });

  it('учитывает оплату и полностью обслуженного гостя в текущем пике', () => {
    const state = createGame();
    state.tick = 1;
    beginPeak(state);
    const guest = { id: 'guest', position: { x: 5, y: 5 }, state: 'eating' as const, patience: 100 };
    const order = { id: 'order', customerId: guest.id, state: 'delivered' as const, progress: 8, dishId: 'soup' };
    const revenue = settleOrder(state, guest, order);
    expect(state.peakState.current?.served).toBe(1);
    expect(state.peakState.current?.revenue).toBe(revenue);
  });

  it('разделяет serviceRatio и completion и выдаёт хорошую награду', () => {
    const state = createGame();
    state.tick = 1;
    beginPeak(state);
    const coins = state.coins;
    const result = finishWith(state, { carriedIn: 2, arrived: 3, served: 3, unhappy: 1 });
    expect(result.serviceRatio).toBe(0.75);
    expect(result.completion).toBe(0.8);
    expect(result.bonusCoins).toBe(300);
    expect(result.bonusXP).toBe(20);
    expect(result.perfect).toBe(false);
    expect(state.coins).toBe(coins + 300);
  });

  it('выдаёт отличную награду и perfect без дополнительной третьей награды', () => {
    const state = createGame();
    state.tick = 1;
    beginPeak(state);
    const result = finishWith(state, { arrived: 5, served: 5 });
    expect(result.serviceRatio).toBe(1);
    expect(result.bonusCoins).toBe(600);
    expect(result.bonusXP).toBe(50);
    expect(result.perfect).toBe(true);
    expect(state.experience).toBe(50);
  });

  it('не даёт отличную награду при отказах или таймаутах очереди', () => {
    const state = createGame();
    state.tick = 1;
    beginPeak(state);
    const result = finishWith(state, { arrived: 5, served: 5, queueRejected: 1 });
    expect(result.bonusCoins).toBe(300);
    expect(result.bonusXP).toBe(20);
    expect(result.perfect).toBe(false);
  });

  it('не дублирует награду и хранит только 30 последних peakId', () => {
    const state = createGame();
    for (let peakId = 0; peakId < 31; peakId += 1) {
      state.tick = peakId * 180 + 1;
      beginPeak(state);
      const result = finishWith(state, { arrived: 5, served: 5 });
      expect(result.peakId).toBe(peakId);
      const coins = state.coins;
      expect(finishPeak(state)).toBeNull();
      expect(state.coins).toBe(coins);
    }
    expect(state.peakState.rewardedPeakIds).toHaveLength(30);
    expect(state.peakState.rewardedPeakIds[0]).toBe(1);
    expect(state.peakState.rewardedPeakIds.at(-1)).toBe(30);
  });

  it('при загрузке середины пика начинает статистику с текущего тика', () => {
    const state = createGame();
    state.tick = 30;
    state.customers.push(
      { id: 'active', position: { x: 5, y: 5 }, state: 'eating', patience: 100 },
      { id: 'leaving', position: { x: 1, y: 7 }, state: 'leaving', patience: 100 },
    );
    state.peakState.current = { ...state.peakState.current!, startedAtTick: 1, arrived: 99 };
    state.peakState.activePeakId = 0;
    normalizeState(state);
    expect(state.peakState.current?.startedAtTick).toBe(30);
    expect(state.peakState.current?.arrived).toBe(0);
    expect(state.peakState.current?.carriedIn).toBe(1);
  });

  it('старое сохранение получает нейтральную структуру вне пика', () => {
    const state = createGame() as Partial<GameState>;
    state.tick = 100;
    delete state.peakState;
    normalizeState(state as GameState);
    expect(state.peakState).toEqual({ activePeakId: null, rewardedPeakIds: [], current: null, last: null });
  });

  it('определяет лимитирующее звено для предупреждения с приоритетом мест при равенстве', () => {
    const state = createGame();
    expect(peakBottleneck(state)).toBe('доставка');
    state.furniture = state.furniture.filter((item) => item.kind !== 'stove');
    expect(peakBottleneck(state)).toBe('кухня');
    state.furniture = state.furniture.filter((item) => item.kind !== 'chair');
    expect(peakBottleneck(state)).toBe('места');
  });
});
