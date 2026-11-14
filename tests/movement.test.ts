import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { moveToward } from '../src/simulation/movement';
import type { Customer } from '../src/simulation/types';

describe('безопасное перемещение', () => {
  it('не входит на клетку другого персонажа', () => {
    const state = createGame();
    const actor = state.employees[0];
    state.customers.push({ id: 'blocker', position: { x: 2, y: 3 }, state: 'waitingFood', patience: 300 });
    expect(moveToward(state, actor, { x: 2, y: 4 })).toBe('moving');
    expect(actor.position).not.toEqual({ x: 2, y: 3 });
  });

  it('не телепортирует при заблокированной цели', () => {
    const state = createGame();
    const actor: Customer = { id: 'g', position: { x: 0, y: 6 }, state: 'waiting', patience: 300 };
    state.customers.push(actor);
    state.furniture.push({ id: 'wall', kind: 'plant', position: { x: 0, y: 5 }, rotation: 0 });
    expect(moveToward(state, actor, { x: 0, y: 5 })).toBe('blocked');
    expect(actor.position).toEqual({ x: 0, y: 6 });
  });

  it('делает только один шаг по найденному маршруту', () => {
    const state = createGame();
    const actor = state.employees[0];
    expect(moveToward(state, actor, { x: 2, y: 4 })).toBe('moving');
    expect(actor.position).toEqual({ x: 2, y: 3 });
  });

  it('блокирует стул, занятый другим гостем', () => {
    const state = createGame();
    const actor: Customer = { id: 'arriving', position: { x: 5, y: 6 }, state: 'seekingSeat', patience: 300 };
    state.customers.push(
      actor,
      { id: 'sitting', position: { x: 5, y: 5 }, state: 'seated', patience: 300, seatId: 'chair-1' },
    );
    expect(moveToward(state, actor, { x: 5, y: 5 })).toBe('blocked');
    expect(actor.position).toEqual({ x: 5, y: 6 });
  });

  it('сообщает о прибытии без изменения позиции', () => {
    const state = createGame();
    const actor = state.employees[0];
    expect(moveToward(state, actor, actor.position)).toBe('arrived');
    expect(actor.position).toEqual({ x: 2, y: 2 });
  });
});
