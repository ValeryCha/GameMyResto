import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { blocksMovement, moveActor, moveToward } from '../src/simulation/movement';
import { chooseGuestAction } from '../src/simulation/ai';
import type { Customer } from '../src/simulation/types';

describe('безопасное перемещение', () => {
  it('не входит на клетку другого персонажа', () => {
    const state = createGame();
    const actor = state.employees[0];
    state.customers.push({ id: 'blocker', position: { x: 2, y: 3 }, state: 'waitingFood', patience: 300 });
    expect(moveToward(state, actor, { x: 2, y: 4 })).toBe('moving');
    expect(actor.position).not.toEqual({ x: 2, y: 3 });
  });

  it('персонал проходит сквозь других сотрудников, но не сквозь гостей', () => {
    const state = createGame();
    const chef = state.employees[0];
    state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 2, y: 3 }, energy: 100 });
    expect(moveToward(state, chef, { x: 2, y: 4 })).toBe('moving');
    expect(chef.position).toEqual({ x: 2, y: 3 });
    state.customers.push({ id: 'guest', position: { x: 2, y: 4 }, state: 'queueWaiting', patience: 300 });
    expect(moveToward(state, chef, { x: 2, y: 4 })).toBe('blocked');
    expect(chef.position).toEqual({ x: 2, y: 3 });
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

  it('гость проходит через другого гостя, но не через сотрудника', () => {
    const state = createGame();
    const actor: Customer = { id: 'arriving', position: { x: 5, y: 6 }, state: 'seekingSeat', patience: 300 };
    state.customers.push(
      actor,
      { id: 'sitting', position: { x: 5, y: 5 }, state: 'seated', patience: 300, seatId: 'chair-1' },
    );
    expect(moveToward(state, actor, { x: 5, y: 5 })).toBe('arrived');
    expect(actor.position).toEqual({ x: 5, y: 5 });

    actor.position = { x: 2, y: 3 };
    expect(moveToward(state, actor, { x: 2, y: 2 })).toBe('blocked');
    expect(actor.position).toEqual({ x: 2, y: 3 });
  });

  it('делает два безопасных шага за один игровой тик', () => {
    const state = createGame();
    const actor = state.employees[0];
    expect(moveActor(state, actor, { x: 2, y: 4 })).toBe('arrived');
    expect(actor.position).toEqual({ x: 2, y: 4 });
  });

  it('поддерживает дополнительный шаг после тренировки', () => {
    const state = createGame();
    const actor = state.employees[0];
    expect(moveActor(state, actor, { x: 2, y: 5 }, 3)).toBe('arrived');
    expect(actor.position).toEqual({ x: 2, y: 5 });
  });

  it('сообщает о прибытии без изменения позиции', () => {
    const state = createGame();
    const actor = state.employees[0];
    expect(moveToward(state, actor, actor.position)).toBe('arrived');
    expect(actor.position).toEqual({ x: 2, y: 2 });
  });

  it('официанты проходят друг через друга', () => {
    const state = createGame();
    const waiter = { id: 'waiter-1', role: 'waiter' as const, position: { x: 5, y: 6 }, energy: 100 };
    state.employees.push(waiter, { id: 'waiter-2', role: 'waiter', position: { x: 5, y: 5 }, energy: 100 });
    expect(moveToward(state, waiter, { x: 5, y: 5 })).toBe('arrived');
    expect(waiter.position).toEqual({ x: 5, y: 5 });
  });

  it('гость и повар блокируют друг друга в обе стороны', () => {
    const state = createGame();
    const chef = state.employees[0];
    const guest: Customer = { id: 'guest', position: { x: 2, y: 3 }, state: 'seekingSeat', patience: 300 };
    state.customers.push(guest);
    expect(moveToward(state, guest, chef.position)).toBe('blocked');
    expect(moveToward(state, chef, guest.position)).toBe('blocked');
    expect(guest.position).toEqual({ x: 2, y: 3 });
    expect(chef.position).toEqual({ x: 2, y: 2 });
  });

  it('мебель блокирует и гостя, и официанта', () => {
    const state = createGame();
    state.furniture.push({ id: 'table-test', kind: 'table', position: { x: 5, y: 4 }, rotation: 0 });
    const guest: Customer = { id: 'guest', position: { x: 5, y: 5 }, state: 'seekingSeat', patience: 300 };
    const waiter = { id: 'waiter', role: 'waiter' as const, position: { x: 5, y: 5 }, energy: 100 };
    state.customers.push(guest);
    state.employees.push(waiter);
    expect(moveToward(state, guest, { x: 5, y: 4 })).toBe('blocked');
    expect(moveToward(state, waiter, { x: 5, y: 4 })).toBe('blocked');
  });

  it('leaving-гость не блокирует персонал, но сам блокируется сотрудником', () => {
    const state = createGame();
    const waiter = { id: 'waiter', role: 'waiter' as const, position: { x: 5, y: 6 }, energy: 100 };
    const leaving: Customer = { id: 'leaving', position: { x: 5, y: 5 }, state: 'leaving', patience: 0 };
    state.employees.push(waiter);
    state.customers.push(leaving);
    expect(blocksMovement(waiter, leaving)).toBe(false);
    expect(moveToward(state, waiter, leaving.position)).toBe('arrived');
    leaving.position = { x: 2, y: 3 };
    expect(moveToward(state, leaving, state.employees[0].position)).toBe('blocked');
  });

  it('гость ждёт перед занятой официантом целью и уходит после истечения терпения', () => {
    const state = createGame();
    const guest: Customer = { id: 'guest', position: { x: 5, y: 6 }, state: 'seekingSeat', patience: 300, seatId: 'chair-1' };
    state.customers.push(guest);
    state.employees.push({ id: 'waiter', role: 'waiter', position: { x: 5, y: 5 }, energy: 100 });
    expect(moveToward(state, guest, { x: 5, y: 5 })).toBe('blocked');
    expect(guest.position).toEqual({ x: 5, y: 6 });
    guest.patience = 0;
    expect(chooseGuestAction(state, guest)).toBe('leave');
  });

  it('повар и официант проходят друг через друга', () => {
    const state = createGame();
    const chef = state.employees[0];
    chef.position = { x: 5, y: 6 };
    const waiter = { id: 'waiter-test', role: 'waiter' as const, position: { x: 5, y: 5 }, energy: 100 };
    state.employees.push(waiter);
    expect(moveToward(state, chef, { x: 5, y: 5 })).toBe('arrived');
    expect(chef.position).toEqual({ x: 5, y: 5 });
  });
});
