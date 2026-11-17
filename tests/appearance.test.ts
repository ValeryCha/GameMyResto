import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createAppearance, appearanceForId, HAIR_STYLES } from '../src/render3d/appearance';
import { createActorMesh } from '../src/render3d/models';
import { updateActorVisual } from '../src/render3d/actors';
import type { Customer } from '../src/simulation/types';

const makeCustomer = (appearance: Partial<Customer> = {}): Customer => ({
  id: 'guest-visual', position: { x: 0, y: 0 }, state: 'waitingFood', patience: 300,
  bodyType: 'feminine', hairStyle: 'bun', hairColor: 0x30231e, skinColor: 0xf2c39c, outfitColor: 0xa76dad,
  ...appearance,
});

describe('внешность гостей', () => {
  it('создаёт пять причёсок и оба силуэта', () => {
    for (const hairStyle of HAIR_STYLES) {
      const model = createActorMesh(makeCustomer({ hairStyle }));
      expect(model.getObjectByName(`hair-${hairStyle}`)).toBeDefined();
    }
    const feminine = createActorMesh(makeCustomer());
    const masculine = createActorMesh(makeCustomer({ bodyType: 'masculine', hairStyle: 'short' }));
    expect(feminine.userData.appearance.bodyType).toBe('feminine');
    expect(masculine.userData.appearance.bodyType).toBe('masculine');
    expect(feminine.getObjectByName('feminine-outfit')).toBeDefined();
    expect(masculine.getObjectByName('feminine-outfit')).toBeUndefined();
  });

  it('сохраняет суставы и физический seatOffset', () => {
    const model = createActorMesh(makeCustomer());
    for (const name of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'head']) {
      expect(model.userData.joints[name]).toBeInstanceOf(THREE.Object3D);
    }
    expect(model.userData.seatOffset).toBe(0);
    updateActorVisual(model, { moving: false, seated: true, time: 1, delta: 1 });
    expect(model.userData.seatOffset).toBeCloseTo(0.22);
  });

  it('показывает и скрывает значок желания', () => {
    const model = createActorMesh(makeCustomer({ hasDesire: true, desiredDishId: 'soup' }));
    updateActorVisual(model, { moving: false, time: 1, delta: 0.016, desired: true });
    expect(model.userData.desireBadge.visible).toBe(true);
    expect(model.userData.desireBadge.userData.label).toBe('★ Суп');
    expect(model.userData.desireBadge.userData.label).not.toContain('×5');
    updateActorVisual(model, { moving: false, time: 1, delta: 0.016, desired: true, desiredDishId: 'pasta' });
    expect(model.userData.desireBadge.userData.label).toBe('★ Паста');
    updateActorVisual(model, { moving: false, time: 1, delta: 0.016, desired: false });
    expect(model.userData.desireBadge.visible).toBe(false);
  });

  it('детерминированно создаёт разнообразие и восстанавливает старых гостей', () => {
    expect(appearanceForId('legacy-1')).toEqual(appearanceForId('legacy-1'));
    const values = Array.from({ length: 30 }, () => createAppearance(Math.random));
    expect(new Set(values.map((value) => value.hairStyle)).size).toBeGreaterThan(2);
    expect(new Set(values.map((value) => value.bodyType)).size).toBe(2);
  });
});
