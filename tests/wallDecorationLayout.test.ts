import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WINDOWS } from '../src/content/windows';
import { createWindowLayer } from '../src/render3d/windows';
import { wallTargets } from '../src/render3d/wallpapers';
import { createGame } from '../src/simulation/createGame';

describe('посадка окон на стенах', () => {
  it.each(['north', 'west', 'south', 'east'] as const)('центрирует все типы окон на стороне %s без вылетов за клетки', (side) => {
    const state = createGame();
    state.appliedWindows = WINDOWS.map((item) => ({ id: `${side}-${item.id}`, windowId: item.id, side, index: 0 }));
    const layer = createWindowLayer(state);
    layer.updateMatrixWorld(true);
    const targets = wallTargets(state.width, state.height);

    for (const item of WINDOWS) {
      const holder = layer.children.find((child) => child.name === `${side}-${item.id}`)!;
      const first = targets.find((target) => target.id === `${side}-0`)!;
      const second = targets.find((target) => target.id === `${side}-1`)!;
      const expected = first.position.clone();
      if (item.widthCells > 1) expected.add(second.position).multiplyScalar(0.5);
      const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), first.rotationY);
      expected.addScaledVector(normal, 0.045);
      expect(holder.position.x).toBeCloseTo(expected.x, 6);
      expect(holder.position.y).toBeCloseTo(expected.y, 6);
      expect(holder.position.z).toBeCloseTo(expected.z, 6);

      const bounds = new THREE.Box3().setFromObject(holder);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const alongWall = side === 'north' || side === 'south' ? size.x : size.z;
      expect(alongWall).toBeLessThanOrEqual(item.widthCells * 0.9 + 0.0001);
      expect(size.y).toBeLessThanOrEqual(first.height * 0.9 + 0.0001);
      if (side === 'north' || side === 'south') expect(center.x).toBeCloseTo(holder.position.x, 6);
      else expect(center.z).toBeCloseTo(holder.position.z, 6);
      expect(center.y).toBeCloseTo(holder.position.y, 6);
    }
  });
});
