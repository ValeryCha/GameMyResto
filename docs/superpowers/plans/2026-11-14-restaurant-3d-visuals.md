# Restaurant 3D Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace schematic Phaser graphics with a skinnable, fully 3D isometric restaurant while preserving gameplay and saves.

**Architecture:** Keep `GameState`, commands and storage unchanged. A `RestaurantWorld` owns Three.js lifecycle, reusable procedural models, fixed orthographic camera and pointer picking. DOM HUD remains separate and reports placement mode.

**Tech Stack:** TypeScript, Three.js, Vite, Vitest, Playwright.

## Global Constraints

- No paid assets, subscriptions, remote images or backend.
- Fixed isometric camera; no rotation controls.
- Building, walls, furniture and actors are genuine 3D meshes.
- `RestaurantSkin` starts with `classic`; skins must not alter simulation or save format.
- Russian UI and existing game behavior must survive.

---

### Task 1: Coordinates and skin contract

**Files:**
- Create: `src/render3d/coordinates.ts`, `src/render3d/skins.ts`
- Test: `tests/coordinates3d.test.ts`, `tests/skins.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `gridToWorld(point: Point): Vector3Like`, `worldToGrid(point: Vector3Like): Point`, `classicSkin: RestaurantSkin`.

- [ ] **Step 1: Install Three.js and types**

Run: `npm install three && npm install -D @types/three`
Expected: dependencies saved, no paid services.

- [ ] **Step 2: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { gridToWorld, worldToGrid } from '../src/render3d/coordinates';

describe('3D coordinates', () => {
  it('keeps the grid origin and round-trips cells', () => {
    expect(gridToWorld({ x: 0, y: 0 })).toEqual({ x: -3.5, y: 0, z: -3.5 });
    expect(worldToGrid(gridToWorld({ x: 3, y: 2 }))).toEqual({ x: 3, y: 2 });
  });
});
```

```ts
import { expect, it } from 'vitest';
import { classicSkin } from '../src/render3d/skins';
it('provides an independent classic skin', () => {
  expect(classicSkin.id).toBe('classic');
  expect(classicSkin.wall).not.toBe(classicSkin.floor);
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test -- --run tests/coordinates3d.test.ts tests/skins.test.ts`
Expected: FAIL, modules do not exist.

- [ ] **Step 4: Implement contracts**

```ts
// coordinates.ts
import type { Point } from '../simulation/types';
export interface Vector3Like { x: number; y: number; z: number }
export const gridToWorld = (p: Point): Vector3Like => ({ x: p.x - 3.5, y: 0, z: p.y - 3.5 });
export const worldToGrid = (p: Vector3Like): Point => ({ x: Math.floor(p.x + 4), y: Math.floor(p.z + 4) });
```

```ts
// skins.ts
export interface RestaurantSkin {
  id: 'classic';
  floor: number; wall: number; trim: number; facade: number;
}
export const classicSkin: RestaurantSkin = {
  id: 'classic', floor: 0xb98254, wall: 0xffe1a6, trim: 0x70452f, facade: 0xd97552,
};
```

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build`
Expected: 15 tests PASS; build PASS.
Commit: `feat: add 3D coordinates and restaurant skin contract`.

---

### Task 2: Procedural building and furniture models

**Files:**
- Create: `src/render3d/materials.ts`, `src/render3d/models.ts`
- Test: `tests/models3d.test.ts`

**Interfaces:**
- Consumes: `classicSkin`, `gridToWorld`.
- Produces: `createFurnitureMesh(item: Furniture, skin: RestaurantSkin): THREE.Group`, `createActorMesh(actor: Employee | Customer): THREE.Group`, `createRestaurantShell(width: number, height: number, skin: RestaurantSkin): THREE.Group`.

- [ ] **Step 1: Write failing structural tests**

```ts
import { describe, expect, it } from 'vitest';
import { createFurnitureMesh, createActorMesh, createRestaurantShell } from '../src/render3d/models';
import { classicSkin } from '../src/render3d/skins';

describe('procedural models', () => {
  it('builds real meshes for every supported object', () => {
    for (const kind of ['door', 'stove', 'table', 'chair', 'plant'] as const) {
      const group = createFurnitureMesh({ id: kind, kind, position: { x: 0, y: 0 }, rotation: 0 }, classicSkin);
      expect(group.isGroup).toBe(true);
      expect(group.children.length).toBeGreaterThan(1);
    }
    expect(createRestaurantShell(8, 8, classicSkin).userData.skinId).toBe('classic');
    expect(createActorMesh({ id: 'guest', position: { x: 0, y: 0 }, state: 'entering', patience: 10 }).children.length).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/models3d.test.ts`
Expected: FAIL, model module absent.

- [ ] **Step 3: Implement reusable materials and mesh factories**

Use `MeshStandardMaterial` with roughness `0.8`, cached by hexadecimal color. Provide helper `box(group, size, position, color)` and `cylinder(group, radius, height, position, color)` that create meshes, enable `castShadow` and `receiveShadow`, and add them to the group. Compose furniture as follows:

```ts
// Required model silhouettes; all dimensions are world units.
// table: 0.8×0.1×0.8 top at y=.65, central leg, four feet.
// chair: .55×.12×.55 seat at y=.4, back at z=.23, four legs.
// stove: .9×.8×.8 body, dark top, four cylinder burners and front controls.
// plant: tapered pot plus five flattened green spheres at different heights.
// door: two posts, lintel and a brown inset panel; never a flat sprite.
```

Create actors from cylinder legs, rounded body, spherical head, hair and arms; chef gets a white hat and waiter a blue jacket. Use actor role if present and coral for customers. `createRestaurantShell` creates 64 individually separated wood floor boxes, back walls along negative x and z edges, baseboards, a façade corner, two windows and a restaurant sign. Set `group.userData.skinId = skin.id` and use only the supplied skin for floor, wall, trim and façade colors.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run build`
Expected: 16 tests PASS; build PASS.
Commit: `feat: build procedural 3D restaurant models`.

---

### Task 3: Three.js world and simulation synchronization

**Files:**
- Create: `src/render3d/RestaurantWorld.ts`
- Modify: `src/main.ts`, `index.html`
- Delete after integration: `src/render/RestaurantScene.ts`, `src/render/iso.ts`, `tests/iso.test.ts`
- Test: `e2e/restaurant.spec.ts`

**Interfaces:**
- Produces: `new RestaurantWorld(container, state, callbacks)`, `setPlantMode(boolean)`, `start()`, `stop()`.
- Callbacks: `onChange`, `onSecond`, `onFrame`.

- [ ] **Step 1: Keep the existing browser test as the regression gate**

Run: `npm run test:e2e`
Expected: current Phaser version PASS before replacement.

- [ ] **Step 2: Implement world lifecycle**

```ts
export interface WorldCallbacks {
  onChange(): void; onSecond(): void; onFrame(): void;
}
export class RestaurantWorld {
  constructor(container: HTMLElement, state: GameState, callbacks: WorldCallbacks) { /* scene, camera, lights, shell, picking */ }
  setPlantMode(enabled: boolean): void { /* update flag and placement highlight */ }
  start(): void { /* requestAnimationFrame, delta cap 100ms, one-second simulation */ }
  stop(): void { /* cancel frame and remove resize/pointer listeners */ }
}
```

Create WebGLRenderer with antialiasing, shadows and `setPixelRatio(Math.min(devicePixelRatio, 2))`. Use an orthographic camera at `(11, 13, 11)` looking at `(0, 0, 0)`, ambient plus directional lighting, and a ground plane beneath the shell. Resize to container dimensions. On pointer click, raycast an invisible floor plane, call `worldToGrid`, check integer bounds, then invoke `placeFurniture(state, 'plant', point)` once; only successful placement calls `onChange`. Maintain entity meshes in `Map<string, Group>`, create missing, update positions, remove absent. Call `onFrame` after each render. Display a Russian error if WebGL construction throws.

- [ ] **Step 3: Replace the bootstrap**

```ts
const storage = new LocalStorageAdapter(window.localStorage);
const state = storage.load();
const hud = createHud(() => world.setPlantMode(true));
const world = new RestaurantWorld(document.querySelector<HTMLElement>('#game')!, state, {
  onChange: () => storage.save(state),
  onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
  onFrame: () => hud.update(state),
});
world.start();
```

Remove Phaser imports/configuration, set `#game` to `width:100vw;height:100vh`, and uninstall Phaser with `npm uninstall phaser`.

- [ ] **Step 4: Adapt browser test using projected picking**

Expose no game internals. Give the canvas `data-testid="restaurant-canvas"`; in the test click its normalized center corresponding to `{x:3,y:2}` only after verifying the projected pixel from the new fixed camera. Assert 1000 → 950, reload → 950, guest visibility and mobile canvas visibility. Capture `restaurant-3d-initial.png`, `restaurant-3d-planted.png`, `restaurant-3d-mobile.png`; collect console/page/HTTP errors.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build && npm run test:e2e`
Expected: unit tests PASS, build PASS, browser PASS.
Commit: `feat: replace schematic renderer with 3D restaurant`.

---

### Task 4: Finish HUD and visual review

**Files:**
- Modify: `src/ui/hud.ts`, `src/main.ts`, `index.html`, `e2e/restaurant.spec.ts`

**Interfaces:**
- `createHud` returns `update(state)` and `setPlantMode(enabled: boolean)` so the placement hint is reversible.

- [ ] **Step 1: Add the failing UI assertions**

In the browser test, click the plant button and expect text `Выберите свободную клетку`; after successful placement expect the hint to be hidden. At 390×844 assert button and HUD are inside the viewport.

- [ ] **Step 2: Verify failure**

Run: `npm run test:e2e`
Expected: FAIL because placement hint is absent.

- [ ] **Step 3: Implement responsive HUD and placement state**

Create grouped labelled values for money, experience, popularity and guests; preserve `data-testid="hud-status"` on the combined text container. Add an accessible hint element with `hidden = !enabled`. Call `hud.setPlantMode(true)` in the button callback and `hud.setPlantMode(false)` after every placement attempt. Style cream panels, dark brown readable text, wood border, restrained shadow and a visible button focus state. No emoji as primary icons and no external fonts.

- [ ] **Step 4: Review images and correct one observed visual issue**

Run the browser test, check PNG sizes, inspect all three screenshots with image reading. Record and fix the actual observed clipping, contrast, overlap or framing issue rather than inventing a correction. Re-run after the correction.

- [ ] **Step 5: Final verification and commit**

Run: `npm test && npm run build && npm run test:e2e && git status --short`
Expected: all PASS and no running development server remains after Playwright exits.
Commit: `feat: polish 3D restaurant interface and visuals`.
