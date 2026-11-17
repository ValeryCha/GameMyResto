import { describe, expect, it } from 'vitest';
import { createFurnitureMesh, createActorMesh, createRestaurantShell } from '../src/render3d/models';
import { classicSkin } from '../src/render3d/skins';
import { furnitureCells } from '../src/simulation/grid';
import * as THREE from 'three';
import { FURNITURE_SKINS } from '../src/content/furnitureSkins';

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

  it('показывает стойку выдачи низким рабочим столом, а не дверью', () => {
    const counter = createFurnitureMesh({ id: 'counter', kind: 'counter', position: { x: 0, y: 0 }, rotation: 0 }, classicSkin);
    expect(new THREE.Box3().setFromObject(counter).max.y).toBeLessThan(1.2);
  });

  it('двойной стол занимает две клетки и имеет широкую столешницу', () => {
    const item = { id: 'double', kind: 'tableDouble' as const, position: { x: 3, y: 3 }, rotation: 0 as const };
    const table = createFurnitureMesh(item, classicSkin);
    const bounds = new THREE.Box3().setFromObject(table);
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(1.7);
    expect(furnitureCells(item)).toEqual([{ x: 3, y: 3 }, { x: 4, y: 3 }]);
    const vertical = createFurnitureMesh({ ...item, rotation: 90 as const }, classicSkin);
    const verticalBounds = new THREE.Box3().setFromObject(vertical);
    expect(verticalBounds.max.z - verticalBounds.min.z).toBeGreaterThan(1.7);
    expect(vertical.position.z).toBe(0);
  });

  it('содержит скрытые сковородку и огонь на плите', () => {
    const stove = createFurnitureMesh({ id: 'stove', kind: 'stove', position: { x: 1, y: 1 }, rotation: 0 }, classicSkin);
    expect(stove.userData.pan).toBeInstanceOf(THREE.Group);
    expect(stove.userData.flame).toBeInstanceOf(THREE.Group);
    expect(stove.userData.pan.visible).toBe(false);
    expect(stove.userData.flame.visible).toBe(false);
  });

  it('строит уникальные рабочие модели для всех 20 новых скинов', () => {
    for (const skin of FURNITURE_SKINS.filter((item) => ['stove', 'counter', 'chef', 'waiter'].includes(item.kind))) {
      const model = skin.kind === 'stove' || skin.kind === 'counter'
        ? createFurnitureMesh({ id: skin.id, kind: skin.kind, position: { x: 0, y: 0 }, rotation: 0 }, classicSkin, null, skin.id)
        : createActorMesh({ id: skin.id, role: skin.kind === 'chef' ? 'chef' : 'waiter', position: { x: 0, y: 0 }, energy: 100 }, skin.id);
      expect(model.isGroup).toBe(true);
      expect(model.children.length).toBeGreaterThan(1);
      expect(new THREE.Box3().setFromObject(model).isEmpty()).toBe(false);
    }
  });

  it('использует точные цвета каждого скина в реальных материалах', () => {
    for (const skin of FURNITURE_SKINS) {
      const model = skin.kind === 'chef' || skin.kind === 'waiter'
        ? createActorMesh({ id: skin.id, role: skin.kind, position: { x: 0, y: 0 }, energy: 100 }, skin.id)
        : createFurnitureMesh({ id: skin.id, kind: skin.kind, position: { x: 0, y: 0 }, rotation: 0 }, classicSkin, null, skin.id);
      const colors = new Set<number>();
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) if ('color' in material) colors.add((material.color as THREE.Color).getHex());
        }
      });
      for (const color of [skin.primary, skin.secondary, skin.accent]) expect(colors, `${skin.id}: ${color}`).toContain(Number.parseInt(color.slice(1), 16));
    }
  });

  it('содержит суставы для анимации и рабочие предметы персонала', () => {
    const chef = createActorMesh({ id: 'chef', role: 'chef', position: { x: 0, y: 0 }, energy: 100 });
    const waiter = createActorMesh({ id: 'waiter', role: 'waiter', position: { x: 0, y: 0 }, energy: 100 });
    for (const name of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'head']) {
      expect(chef.userData.joints[name]).toBeInstanceOf(THREE.Object3D);
    }
    expect(chef.userData.cooking).toBeInstanceOf(THREE.Object3D);
    expect(waiter.userData.carrying).toBeInstanceOf(THREE.Object3D);
    expect(waiter.userData.carrying.visible).toBe(false);
    const guest = createActorMesh({ id: 'guest', position: { x: 0, y: 0 }, state: 'seated', patience: 300 });
    expect(guest.userData.patienceRing).toBeInstanceOf(THREE.Mesh);
    expect(guest.userData.patienceBack).toBeUndefined();
  });
});
