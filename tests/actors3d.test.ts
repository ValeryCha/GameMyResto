import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createActorMesh } from '../src/render3d/models';
import { updateActorVisual } from '../src/render3d/actors';

describe('анимация персонажей', () => {
  it('двигает руки и ноги в противофазе и останавливает их на месте', () => {
    const model = createActorMesh({ id: 'guest', position: { x: 0, y: 0 }, state: 'seekingSeat', patience: 300 });
    updateActorVisual(model, { moving: true, time: 1, delta: 0.016 });
    const { leftArm, rightArm, leftLeg, rightLeg } = model.userData.joints;
    expect(leftArm.rotation.x).toBeGreaterThan(0);
    expect(rightArm.rotation.x).toBeLessThan(0);
    expect(leftLeg.rotation.x).toBeLessThan(0);
    expect(rightLeg.rotation.x).toBeGreaterThan(0);
    updateActorVisual(model, { moving: false, time: 1.016, delta: 0.016 });
    expect(Math.abs(leftArm.rotation.x)).toBeLessThan(0.4);
  });

  it('показывает посадку сгибанием ног без полосы над головой', () => {
    const model = createActorMesh({ id: 'guest', position: { x: 0, y: 0 }, state: 'seated', patience: 300 });
    updateActorVisual(model, { moving: false, seated: true, time: 1, delta: 1 });
    expect(model.userData.joints.leftLeg.rotation.x).toBeLessThan(-0.8);
    expect(model.userData.seatOffset).toBeLessThan(0);
    expect(model.userData.patienceRing).toBeInstanceOf(THREE.Object3D);
    expect(model.userData.patienceBack).toBeUndefined();
  });
});
