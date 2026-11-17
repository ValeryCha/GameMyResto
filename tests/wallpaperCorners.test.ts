import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { normalizeState } from '../src/persistence/normalizeState';
import { createWallpaperLayer } from '../src/render3d/wallpapers';
import { applyWallpaper } from '../src/simulation/decorations';
import { createGame } from '../src/simulation/createGame';

function wallCellAt(group: THREE.Group, origin: THREE.Vector3, direction: THREE.Vector3): string | undefined {
  const raycaster = new THREE.Raycaster(origin, direction.normalize());
  return raycaster.intersectObjects(group.children, false)[0]?.object.userData.wallCellId;
}

describe('обои в угловых стыках стен', () => {
  it.each([8, 12])('принимает обе смежные клетки угла на поле $size×$size и сохраняет их', (size) => {
    const state = createGame();
    state.level = 25;
    state.coins = 100_000;
    state.width = size;
    state.height = size;

    expect(applyWallpaper(state, 'north-0', 'goldenHoliday').ok).toBe(true);
    expect(applyWallpaper(state, 'west-0', 'goldenHoliday').ok).toBe(true);
    normalizeState(state);

    expect(state.appliedWallpapers).toEqual(expect.arrayContaining([
      { wallCellId: 'north-0', wallpaperId: 'goldenHoliday' },
      { wallCellId: 'west-0', wallpaperId: 'goldenHoliday' },
    ]));
    expect(state.appliedWallpapers).toHaveLength(size === 8 ? 2 : 18);
  });

  it.each([8, 12])('рейкаст попадает в обе плоскости угла на поле $size×$size, а не между мешами', (size) => {
    const state = createGame();
    state.width = size;
    state.height = size;
    const layer = createWallpaperLayer(state);
    layer.updateMatrixWorld(true);

    expect(wallCellAt(layer, new THREE.Vector3(-3.9, 1.08, -2), new THREE.Vector3(0, 0, -1))).toBe('north-0');
    expect(wallCellAt(layer, new THREE.Vector3(-2, 1.08, -3.9), new THREE.Vector3(-1, 0, 0))).toBe('west-0');
    expect(wallCellAt(layer, new THREE.Vector3(-2, 1.08, -2), new THREE.Vector3(0, 0, -1))).toBe('north-1');
    expect(wallCellAt(layer, new THREE.Vector3(-2, 1.08, -2), new THREE.Vector3(-1, 0, 0))).toBe('west-1');
  });
});
