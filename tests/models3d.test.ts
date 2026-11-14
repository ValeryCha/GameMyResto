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
