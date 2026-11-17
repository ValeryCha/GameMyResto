import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRestaurantEnvironment } from '../src/render3d/environment';
import { wallTargets } from '../src/render3d/wallpapers';

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

  it('создаёт raycast-цели для всех стен после расширения', () => {
    const targets = wallTargets(12, 12);
    expect(targets).toHaveLength(48);
    expect(targets.map((target) => target.id)).toEqual(expect.arrayContaining([
      'north-8', 'south-11', 'west-8', 'east-11',
    ]));
  });
});
