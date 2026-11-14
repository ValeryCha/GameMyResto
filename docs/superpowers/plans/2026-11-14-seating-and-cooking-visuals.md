# Seating and Cooking Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять сидящих гостей на сиденье и показывать сковородку с огнём на плите во время готовки.

**Architecture:** Меняются только 3D-представление и синхронизация визуальных флагов. Существующие `updateChef`, `moveActor`, состояния заказов и сохранения остаются источником логики.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright.

## Global Constraints

Сидящий guest визуально поднимается к `+0.22`; логические координаты не меняются. Огонь и сковородка видимы только при `cooking`. Без внешних ассетов, новых зависимостей и отдельных таймеров.

---

### Task 1: Корректная посадка

**Files:** `src/render3d/actors.ts`, `tests/actors3d.test.ts`

**Interfaces:** `updateActorVisual` сохраняет сигнатуру, `model.userData.seatOffset` остаётся числом.

- [ ] **Шаг 1: failing test**

```ts
const model = createActorMesh({ id: 'guest', position: { x: 5, y: 5 }, state: 'seated', patience: 300 });
updateActorVisual(model, { seated: true, moving: false, time: 1, delta: 1 });
expect(model.userData.seatOffset).toBe(0.22);
```

- [ ] **Шаг 2: RED**

Run: `npx vitest run tests/actors3d.test.ts`
Expected: FAIL — текущее значение `-0.24`.

- [ ] **Шаг 3: реализация**

Заменить цель `visual.seated ? -0.24 : 0` на `visual.seated ? 0.22 : 0`, сохранив damping.

- [ ] **Шаг 4: GREEN и commit**

Run: `npx vitest run tests/actors3d.test.ts`
Expected: PASS.
`git add src/render3d/actors.ts tests/actors3d.test.ts && git commit -m "fix: seat guests on chair seat"`

### Task 2: Сковородка и огонь на плите

**Files:** `src/render3d/models.ts`, `src/render3d/actors.ts`, `src/render3d/RestaurantWorld.ts`, `tests/models3d.test.ts`, `e2e/ai.spec.ts`

**Interfaces:** плита имеет `userData.pan: THREE.Group`, `userData.flame: THREE.Group`; `syncEntities` получает `cooking: boolean`.

- [ ] **Шаг 1: failing test**

```ts
const stove = createFurnitureMesh({ id: 'stove', kind: 'stove', position: { x: 1, y: 1 }, rotation: 0 }, classicSkin);
expect(stove.userData.pan).toBeInstanceOf(THREE.Group);
expect(stove.userData.flame).toBeInstanceOf(THREE.Group);
expect(stove.userData.pan.visible).toBe(false);
expect(stove.userData.flame.visible).toBe(false);
```

E2E во время готовки проверяет видимый огонь, после `waitingDelivery` — скрытый. Состояние берётся из сохраняемого заказа, без изменения симуляции.

- [ ] **Шаг 2: RED**

Run: `npx vitest run tests/models3d.test.ts`
Expected: FAIL — элементов плиты нет.

- [ ] **Шаг 3: реализация**

В `stoveModel` создать `pan` из плоского цилиндра и ручки, `flame` из трёх заострённых конусов/сфер жёлтого и оранжевого цвета. Добавить в группу плиты, установить `visible=false`, сохранить в `userData`. В `syncEntities` для каждой плиты вычислить `state.orders.some(order => order.state === 'cooking')`, переключить видимость и изменять масштаб пламени `0.9 + sin(time/90)*0.1`. Удалить показ/вращение `model.userData.cooking` у актора; повар продолжает подходить по существующему `updateChef`.

- [ ] **Шаг 4: полная проверка**

Run: `npm test && npm run build && npm run test:e2e`
Expected: все тесты PASS, сборка успешна; визуально проверить снимки гостя и готовки.

- [ ] **Шаг 5: commit**

`git add src/render3d tests/models3d.test.ts e2e/ai.spec.ts && git commit -m "feat: show pan and flame on active stove"`
