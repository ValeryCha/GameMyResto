# Precise Camera and Door Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Точное перетаскивание камеры, автоподбор вида, поворот двери и её перенос при росте внешних границ.

**Architecture:** Общая функция `expandBounds` синхронно меняет размеры и положение двери. Камера использует мировые точки пола для drag и вычисляет вмещающий zoom при сбросе. Существующие команды редактора расширяются только для поворота двери.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright.

## Global Constraints

Расширение всегда `+2×2`; перенос двери стоит 100 монет; её поворот бесплатен. Дверь нельзя перемещать или удалять через редактор. Инерцию камеры не добавлять. Не менять остальную экономику и маршруты персонажей.

---

### Task 1: Дверь следует за растущими стенами

**Files:**
- Create: `src/simulation/expansion.ts`
- Modify: `src/simulation/progression.ts`, `src/simulation/shop.ts`, `src/simulation/commands.ts`
- Test: `tests/progression.test.ts`, `tests/commands.test.ts`

**Interfaces:** `expandBounds(state: GameState): void`; `moveDoor` сохраняет подпись и автоматически задаёт rotation.

- [ ] **Шаг 1: failing tests**

Добавить параметрические проверки: дверь `{x:7,y:3}` при поле 8×8 после расширения становится `{x:9,y:3}`; `{x:3,y:7}` → `{x:3,y:9}`; `{x:7,y:7}` → `{x:9,y:9}`; `{x:0,y:7}` → `{x:0,y:9}`; `{x:7,y:0}` → `{x:9,y:0}`. Дверь `{x:0,y:3}` и `{x:3,y:0}` не меняется. Проверить повторное расширение и вызов через `processProgression`/`expandRestaurant`.

```ts
const state = createGame();
state.furniture.find((item) => item.kind === 'door')!.position = { x: 7, y: 3 };
expandRestaurant(state);
expect(state.furniture.find((item) => item.kind === 'door')!.position).toEqual({ x: 9, y: 3 });
```

- [ ] **Шаг 2: RED**

Run: `npx vitest run tests/progression.test.ts tests/commands.test.ts`
Expected: FAIL — дверь остаётся на старой координате.

- [ ] **Шаг 3: реализация**

```ts
import type { GameState } from './types';

export function expandBounds(state: GameState): void {
  const door = state.furniture.find((item) => item.kind === 'door');
  if (door?.position.x === state.width - 1) door.position.x += 2;
  if (door?.position.y === state.height - 1) door.position.y += 2;
  state.width += 2;
  state.height += 2;
}
```

Заменить обе пары `state.width += 2; state.height += 2` на `expandBounds(state)`. В `moveDoor` после проверки границы задать `door.rotation = position.x === 0 ? 90 : position.x === state.width - 1 ? 270 : position.y === 0 ? 0 : 180`.

- [ ] **Шаг 4: GREEN**

Run: `npx vitest run tests/progression.test.ts tests/commands.test.ts`
Expected: PASS.

- [ ] **Шаг 5: commit**

```bash
git add src/simulation tests/progression.test.ts tests/commands.test.ts
git commit -m "feat: keep doors on growing walls"
```

### Task 2: Выбор и поворот двери

**Files:**
- Modify: `src/simulation/commands.ts`, `src/render3d/RestaurantWorld.ts`, `src/ui/editorPanel.ts`
- Test: `tests/commands.test.ts`, `e2e/editor.spec.ts`

**Interfaces:** `rotateFurniture(state,id)` принимает дверь; `moveFurniture`/`removeFurniture` её по-прежнему отклоняют.

- [ ] **Шаг 1: failing tests**

```ts
const state = createGame();
const door = state.furniture.find((item) => item.kind === 'door')!;
const coins = state.coins;
expect(rotateFurniture(state, door.id)).toEqual({ ok: true });
expect(door.rotation).toBe(90);
expect(state.coins).toBe(coins);
expect(moveFurniture(state, door.id, { x: 0, y: 6 }).ok).toBe(false);
expect(removeFurniture(state, door.id).ok).toBe(false);
```

E2E: открыть «Обстановка», кликнуть по видимой двери, проверить заголовок «Дверь», нажать «Повернуть» и проверить, что кнопки «Переместить»/«Удалить» недоступны.

- [ ] **Шаг 2: RED**

Run: `npx vitest run tests/commands.test.ts && npx playwright test e2e/editor.spec.ts`
Expected: FAIL — дверь исключена из редактирования.

- [ ] **Шаг 3: реализация**

В `rotateFurniture` искать любой объект по `id`, но для неизвестного id вернуть `Объект не найден`. В raycast редактора убрать фильтр `kind !== 'door'`. В `editorPanel` отображать дверь, включать только кнопку поворота; move/delete оставить disabled. Ориентацию применяет существующий `createFurnitureMesh`.

- [ ] **Шаг 4: GREEN**

Run: `npx vitest run tests/commands.test.ts && npx playwright test e2e/editor.spec.ts`
Expected: PASS.

- [ ] **Шаг 5: commit**

```bash
git add src/simulation/commands.ts src/render3d/RestaurantWorld.ts src/ui/editorPanel.ts tests/commands.test.ts e2e/editor.spec.ts
git commit -m "feat: rotate entrance door in editor"
```

### Task 3: Точный drag и вмещающий сброс вида

**Files:**
- Create: `src/render3d/cameraMath.ts`
- Modify: `src/render3d/RestaurantWorld.ts`
- Test: `tests/cameraMath.test.ts`, `e2e/editor.spec.ts`

**Interfaces:** `fitZoom(width,height,aspect): number`; `RestaurantWorld` хранит `drag.floorPoint: THREE.Vector3`.

- [ ] **Шаг 1: failing tests**

```ts
expect(fitZoom(8, 8, 16 / 10)).toBe(1);
expect(fitZoom(16, 16, 16 / 10)).toBeLessThan(1);
expect(fitZoom(8, 8, 0.5)).toBeLessThan(1);
expect(fitZoom(30, 30, 0.5)).toBeLessThan(fitZoom(16, 16, 0.5));
```

E2E после drag проверяет отсутствие выбора, а после сброса вида — видимость всего ресторана на увеличенном поле.

- [ ] **Шаг 2: RED**

Run: `npx vitest run tests/cameraMath.test.ts`
Expected: FAIL — модуль отсутствует.

- [ ] **Шаг 3: реализация**

`fitZoom = min(1, 8 / max(width, height))` с поправкой на узкий экран: при `aspect < 1` умножить отношение на `aspect`. В `resetView` использовать этот zoom. Для drag вычислять `floorPoint` через `raycaster` и `floorPlane`; на move получить новую точку, вычесть разность из `pan`, затем обновить сохранённые координаты. Сохранять `startX/startY` для клика.

```ts
const current = this.floorFromPointer(event);
if (current && this.drag.floorPoint) {
  this.pan.x += this.drag.floorPoint.x - current.x;
  this.pan.z += this.drag.floorPoint.z - current.z;
}
```

Вынести общий `floorFromPointer(event): THREE.Vector3 | null`; `gridFromPointer` использует его. При clamp ограничении повторно синхронизировать опорную точку, чтобы следующий кадр не накапливал ошибку.

- [ ] **Шаг 4: GREEN**

Run: `npx vitest run tests/cameraMath.test.ts && npx playwright test e2e/editor.spec.ts`
Expected: PASS.

- [ ] **Шаг 5: полная проверка и commit**

Run: `npm test && npm run build && npm run test:e2e`
Expected: все тесты PASS, сборка успешна.

```bash
git add src/render3d tests/cameraMath.test.ts e2e/editor.spec.ts
git commit -m "feat: add precise camera drag and fitted reset"
```
