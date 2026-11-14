# Restaurant Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить процедурное 3D-окружение с газоном, дорогами, тротуарами и уличными декорациями, размеры которого обновляются вместе с границами ресторана.

**Architecture:** Новый чистый модуль `environment.ts` создаёт `THREE.Group` только по ширине и высоте зала. `RestaurantWorld` владеет группой окружения и пересоздаёт её одновременно со стенами при расширении, не затрагивая состояние симуляции.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Global Constraints

- Не добавлять внешние модели, текстуры, сетевые запросы и зависимости.
- Не изменять игровые клетки, маршруты, экономику, редактор и правила камеры.
- Поддерживать поле 8×8 и расширения +2×2.
- Все артефакты остаются внутри текущего workspace; после проверок не оставлять dev server запущенным.

---

### Task 1: Процедурная модель окружения

**Files:**
- Create: `src/render3d/environment.ts`
- Create: `tests/environment3d.test.ts`

**Interfaces:**
- Consumes: `box`, `cylinder`, `sphere` из `src/render3d/materials.ts`.
- Produces: `createRestaurantEnvironment(width: number, height: number): THREE.Group`; `userData` содержит `width`, `height`, `groundWidth`, `groundDepth`, `roadLengthX`, `roadLengthZ`; именованные дочерние группы `roads`, `sidewalks`, `landscaping`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRestaurantEnvironment } from '../src/render3d/environment';

describe('restaurant environment', () => {
  it('создаёт полное окружение и масштабирует его вместе с залом', () => {
    const initial = createRestaurantEnvironment(8, 8);
    const expanded = createRestaurantEnvironment(12, 12);
    expect(initial).toBeInstanceOf(THREE.Group);
    for (const name of ['roads', 'sidewalks', 'landscaping']) {
      expect(initial.getObjectByName(name)).toBeInstanceOf(THREE.Group);
    }
    expect(initial.userData.groundWidth).toBe(24);
    expect(initial.userData.groundDepth).toBe(24);
    expect(expanded.userData.groundWidth).toBe(28);
    expect(expanded.userData.groundDepth).toBe(28);
    expect(expanded.userData.roadLengthX - initial.userData.roadLengthX).toBe(4);
    expect(expanded.userData.roadLengthZ - initial.userData.roadLengthZ).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/environment3d.test.ts`
Expected: FAIL, потому что `src/render3d/environment.ts` ещё не существует.

- [ ] **Step 3: Write minimal implementation**

Создать `src/render3d/environment.ts`:

```ts
import * as THREE from 'three';
import { box, cylinder, sphere } from './materials';

function addTree(parent: THREE.Group, x: number, z: number, scale = 1): void {
  const tree = new THREE.Group();
  cylinder(tree, 0.15 * scale, 1.25 * scale, [0, 0.63 * scale, 0], 0x725039);
  sphere(tree, 0.72 * scale, [0, 1.55 * scale, 0], 0x3d7d42, [0.9, 1.05, 0.9]);
  sphere(tree, 0.5 * scale, [0.42 * scale, 1.45 * scale, 0], 0x4d914c);
  sphere(tree, 0.48 * scale, [-0.35 * scale, 1.5 * scale, 0.12 * scale], 0x478947);
  tree.position.set(x, -0.4, z);
  parent.add(tree);
}

function addLamp(parent: THREE.Group, x: number, z: number): void {
  const lamp = new THREE.Group();
  cylinder(lamp, 0.09, 0.18, [0, 0.09, 0], 0x687477);
  cylinder(lamp, 0.045, 2.35, [0, 1.25, 0], 0x7f8d91);
  sphere(lamp, 0.18, [0, 2.48, 0], 0xfff1c8);
  lamp.position.set(x, -0.27, z);
  parent.add(lamp);
}

function addBench(parent: THREE.Group, x: number, z: number): void {
  const bench = new THREE.Group();
  for (const localZ of [-0.2, 0, 0.2]) box(bench, [1.45, 0.09, 0.15], [0, 0.48, localZ], 0x9a673d);
  for (const localY of [0.78, 1.0]) box(bench, [1.45, 0.15, 0.08], [0, localY, 0.28], 0x9a673d);
  for (const localX of [-0.55, 0.55]) {
    box(bench, [0.09, 0.48, 0.09], [localX, 0.24, 0], 0x4b5553);
    box(bench, [0.09, 0.72, 0.09], [localX, 0.58, 0.28], 0x4b5553);
  }
  bench.position.set(x, -0.4, z);
  parent.add(bench);
}

export function createRestaurantEnvironment(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const offsetX = (width - 8) / 2;
  const offsetZ = (height - 8) / 2;
  const groundWidth = width + 16;
  const groundDepth = height + 16;
  const roadLengthX = width + 10;
  const roadLengthZ = height + 10;
  group.userData = { width, height, groundWidth, groundDepth, roadLengthX, roadLengthZ };

  box(group, [groundWidth, 0.16, groundDepth], [offsetX, -0.5, offsetZ], 0x70a84f);

  const roads = new THREE.Group();
  roads.name = 'roads';
  box(roads, [roadLengthX, 0.06, 3], [offsetX + 1, -0.39, -6.4], 0x555b5d);
  box(roads, [3, 0.06, roadLengthZ], [-6.4, -0.39, offsetZ + 1], 0x555b5d);
  for (let x = -3; x < width - 3; x += 2.4) box(roads, [1.15, 0.025, 0.1], [x, -0.35, -6.4], 0xf3ead2);
  for (let z = -3; z < height - 3; z += 2.4) box(roads, [0.1, 0.025, 1.15], [-6.4, -0.35, z], 0xf3ead2);
  for (let index = 0; index < 6; index += 1) {
    box(roads, [0.32, 0.03, 2.35], [offsetX + 0.6 + index * 0.55, -0.34, -6.4], 0xf7f3e8);
  }
  group.add(roads);

  const sidewalks = new THREE.Group();
  sidewalks.name = 'sidewalks';
  for (let x = -4; x < width - 3; x += 1) {
    box(sidewalks, [0.96, 0.16, 0.85], [x, -0.35, -4.58], (x + 4) % 2 ? 0xd4d0c2 : 0xe2ded0);
  }
  for (let z = -4; z < height - 3; z += 1) {
    box(sidewalks, [0.85, 0.16, 0.96], [-4.58, -0.35, z], (z + 4) % 2 ? 0xd4d0c2 : 0xe2ded0);
  }
  box(sidewalks, [roadLengthX, 0.2, 0.16], [offsetX + 1, -0.34, -4.98], 0xb7b5aa);
  box(sidewalks, [0.16, 0.2, roadLengthZ], [-4.98, -0.34, offsetZ + 1], 0xb7b5aa);
  group.add(sidewalks);

  const landscaping = new THREE.Group();
  landscaping.name = 'landscaping';
  addTree(landscaping, width - 2.7, -1.8, 0.9);
  addTree(landscaping, width - 2.5, height - 5.2, 1.05);
  addTree(landscaping, -1.5, height - 2.6, 0.85);
  for (const [x, z] of [[width - 3.2, 0.8], [1.2, height - 3.1], [width - 4.1, height - 2.7]] as const) {
    sphere(landscaping, 0.48, [x, 0.05, z], 0x398141, [1.15, 0.85, 1]);
  }
  addBench(landscaping, offsetX + 1.2, height - 2.5);
  for (let x = -2; x < width - 3; x += 4) addLamp(landscaping, x, -4.55);
  group.add(landscaping);
  return group;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/environment3d.test.ts`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render3d/environment.ts tests/environment3d.test.ts
git commit -m "feat: add scalable restaurant surroundings"
```

---

### Task 2: Подключение окружения к жизненному циклу ресторана

**Files:**
- Modify: `src/render3d/RestaurantWorld.ts`
- Test: `tests/environment3d.test.ts`

**Interfaces:**
- Consumes: `createRestaurantEnvironment(width, height)` из Task 1.
- Produces: поле `environment: THREE.Group`, которое всегда соответствует текущим `state.width` и `state.height`.

- [ ] **Step 1: Connect the environment to scene creation**

Добавить импорт и поле, заменить круглое основание в конструкторе:

```ts
import { createRestaurantEnvironment } from './environment';

// В классе рядом с shell:
private environment: THREE.Group;

// В конструкторе вместо создания CircleGeometry:
this.environment = createRestaurantEnvironment(state.width, state.height);
this.scene.add(this.environment);
```

- [ ] **Step 2: Rebuild the environment when the room expands**

В `syncShell()` удалить старое окружение, освободить его геометрию и создать новое вместе со стенами:

```ts
this.scene.remove(this.environment);
this.environment.traverse((object) => {
  if (object instanceof THREE.Mesh) object.geometry.dispose();
});
this.environment = createRestaurantEnvironment(this.state.width, this.state.height);
this.scene.add(this.environment);
```

Существующая ранняя проверка одинаковых `width` и `height` должна предотвращать пересоздание на каждом кадре.

- [ ] **Step 3: Run focused and full checks**

Run: `npx vitest run tests/environment3d.test.ts && npm test && npm run build`
Expected: 21 test file, 82 tests PASS; TypeScript и Vite build завершаются с exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/render3d/RestaurantWorld.ts
git commit -m "feat: rebuild surroundings after restaurant expansion"
```

---

### Task 3: Браузерная и визуальная проверка

**Files:**
- Inspect: `artifacts/restaurant-3d-initial.png`
- Inspect: `artifacts/restaurant-3d-mobile.png`
- Inspect: `artifacts/restaurant-progression-mobile.png`

**Interfaces:**
- Consumes: подключённое окружение из Task 2 и существующие Playwright-сценарии.
- Produces: проверенный основной проект без временной ветки и работающего фонового сервера.

- [ ] **Step 1: Run browser scenarios**

Run: `npm run test:e2e`
Expected: 7 scenarios PASS; временный Playwright web server останавливается после прогона.

- [ ] **Step 2: Inspect screenshots**

Проверить размер каждого PNG перед открытием. Открыть снимки и убедиться: дорога и зебра находятся за дальними стенами; газон заполняет внешний фон; декорации не попадают в зал; интерфейс и ресторан остаются читаемыми на мобильном экране; после расширения окружение соответствует новым границам.

- [ ] **Step 3: Verify final state**

Run: `git status --short && git diff --check`
Expected: нет неучтённых изменений реализации; существующие посторонние untracked-файлы не добавлять в коммиты.

- [ ] **Step 4: Finish the development branch**

Использовать `superpowers:finishing-a-development-branch`, предложить варианты завершения. При локальном слиянии выполнить fast-forward в `master`, запустить `npm test`, удалить только созданную для задачи worktree, удалить feature-ветку и повторно запустить `npm test` из основного проекта.
