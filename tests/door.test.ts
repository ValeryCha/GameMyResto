import { describe, expect, it } from 'vitest';
import { createFurnitureMesh, updateDoorVisual } from '../src/render3d/models';
import { classicSkin } from '../src/render3d/skins';
import type { Group } from 'three';

describe('анимация двери', () => {
  it('открывает створку наружу, освобождая внутренний маршрут гостя', () => {
    const door = createFurnitureMesh({ id: 'door', kind: 'door', position: { x: 0, y: 7 }, rotation: 90 }, classicSkin);
    for (let frame = 0; frame < 60; frame += 1) updateDoorVisual(door, true, 1 / 60);
    const leaf = door.userData.doorLeaf as Group;
    expect(leaf.rotation.y).toBeGreaterThan(1.4);
    for (let frame = 0; frame < 60; frame += 1) updateDoorVisual(door, false, 1 / 60);
    expect(leaf.rotation.y).toBeCloseTo(0, 2);
  });
});
