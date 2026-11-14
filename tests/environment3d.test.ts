import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRestaurantEnvironment } from '../src/render3d/environment';

describe('restaurant environment', () => {
  it('удаляет дорожный фон и масштабирует нейтральное окружение вместе с залом', () => {
    const initial = createRestaurantEnvironment(8, 8);
    const expanded = createRestaurantEnvironment(12, 12);
    expect(initial).toBeInstanceOf(THREE.Group);
    expect(initial.getObjectByName('roads')).toBeUndefined();
    expect(initial.getObjectByName('sidewalks')).toBeUndefined();
    expect(initial.getObjectByName('landscaping')).toBeInstanceOf(THREE.Group);
    expect(initial.userData).not.toHaveProperty('roadLengthX');
    expect(initial.userData).not.toHaveProperty('roadLengthZ');
    expect(initial.userData.groundWidth).toBe(24);
    expect(initial.userData.groundDepth).toBe(24);
    expect(expanded.userData.groundWidth).toBe(28);
    expect(expanded.userData.groundDepth).toBe(28);
  });
});
