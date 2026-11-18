import { isWalkable, samePoint } from './grid';
import { isSeatCurrent } from './seating';
import type { Customer, GameState, Point } from './types';

const DIRECTIONS: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
const SEATED_STATES = new Set<Customer['state']>(['seated', 'ordering', 'waitingFood', 'eating']);

function nearestFreeCell(state: GameState, origin: Point, occupied: Set<string>): Point | undefined {
  const queue: Point[] = [{ ...origin }];
  const visited = new Set<string>();
  while (queue.length) {
    const point = queue.shift()!;
    const key = `${point.x},${point.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (isWalkable(state, point) && !occupied.has(key)) return point;
    for (const direction of DIRECTIONS) {
      const next = { x: point.x + direction.x, y: point.y + direction.y };
      if (next.x >= 0 && next.y >= 0 && next.x < state.width && next.y < state.height) queue.push(next);
    }
  }
  return undefined;
}

/**
 * Возвращает гостей после паузы редактора. Идентичность, заказ, очередь, таймеры и цели
 * не пересоздаются; позиция меняется только вместе со стулом или при новом препятствии.
 */
export function restoreGuestsAfterEditor(state: GameState): string[] {
  const relocated: string[] = [];
  const occupied = new Set(state.employees.map((employee) => `${employee.position.x},${employee.position.y}`));

  for (const guest of state.customers) {
    const original = { ...guest.position };
    const seated = SEATED_STATES.has(guest.state);
    const needsSeat = seated || guest.state === 'seekingSeat';
    const chair = guest.seatId
      ? state.furniture.find((item) => item.id === guest.seatId && item.kind === 'chair')
      : undefined;
    const seatIsValid = Boolean(chair && isSeatCurrent(state, guest));
    let desired = original;

    if (needsSeat) {
      if (chair && seatIsValid) {
        // Если стул переместили, гость остаётся на том же стуле и сохраняет заказ.
        desired = { ...chair.position };
        if (guest.state === 'seekingSeat') guest.target = { ...chair.position };
      } else {
        // Удалённый стул или разорванная пара стол–стул не удаляют гостя и его заказ.
        guest.seatId = undefined;
        guest.target = undefined;
      }
    }

    const destination = nearestFreeCell(state, desired, occupied) ?? nearestFreeCell(state, original, occupied);
    if (destination && !samePoint(destination, original)) {
      guest.position = { ...destination };
      relocated.push(guest.id);
    }
    occupied.add(`${guest.position.x},${guest.position.y}`);

    if (guest.target && guest.state !== 'leaving' && !isWalkable(state, guest.target)) guest.target = undefined;
  }
  return relocated;
}

export function setEditorMode(state: GameState, enabled: boolean): string[] {
  if (enabled) {
    state.editorMode = true;
    return [];
  }
  if (!state.editorMode) return [];
  delete state.editorMode;
  return restoreGuestsAfterEditor(state);
}
