import { describe, expect, it } from 'vitest';
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
});
