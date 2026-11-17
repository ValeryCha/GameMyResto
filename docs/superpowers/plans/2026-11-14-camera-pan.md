# Camera Pan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mouse, touch and keyboard camera panning with bounded movement and a view reset.

**Architecture:** Store pan and active pointer state in `RestaurantWorld`; apply the offset in `resize()`. Disable gestures during furniture interactions and clean up listeners on dispose.

**Tech Stack:** TypeScript, Three.js, Playwright.

## Global Constraints

- Preserve zoom, picking, placement, editor and saves.
- Pan with left-drag/one-finger touch on the ordinary scene, WASD/arrows, and reset via `Сбросить вид`.
- Keep the restaurant within bounded camera limits.

### Task 1: Browser Regression

- [ ] Add to `e2e/restaurant.spec.ts` assertions for `Сбросить вид`, a canvas drag, `ArrowRight`, `KeyA`, and reset on desktop and mobile.
- [ ] Run `npx playwright test e2e/restaurant.spec.ts`; expected failure because reset is absent.

### Task 2: Camera Pan

**Files:** `src/render3d/RestaurantWorld.ts`

- [ ] Add `pan = new THREE.Vector3()`, pointer state and a third camera button `Сбросить вид`.
- [ ] On ordinary `pointerdown`, capture the pointer and record coordinates. On move, convert screen delta using zoom/canvas height and camera ground axes; clamp pan to half the current field plus 2 cells.
- [ ] Finish/cancel gestures on pointerup/cancel and remove pointer capture. Do not start panning in placement, door-move or editor modes.
- [ ] Add `onKeyDown` for WASD/arrows outside inputs; move by 0.6/zoom in screen-relative ground directions and clamp.
- [ ] Apply `pan` after the field-center offset in `resize()`. Reset sets pan `(0,0,0)` and zoom 1.
- [ ] Remove window/canvas listeners and controls on dispose; cancel panning in `stop()`.

### Task 3: Verification

- [ ] Run `npm test && npm run build && npm run test:e2e`.
- [ ] Inspect desktop/mobile screenshots for controls and overlap.
- [ ] Merge only after all tests and visual checks pass; remove the temporary worktree afterward.
