import * as THREE from 'three';

export interface ActorVisualState {
  moving: boolean;
  time: number;
  delta: number;
  patience?: number;
  carrying?: boolean;
  cooking?: boolean;
}

export function updateActorVisual(model: THREE.Group, visual: ActorVisualState): void {
  const joints = model.userData.joints as Record<string, THREE.Object3D>;
  const damping = 1 - Math.exp(-10 * visual.delta);
  const swing = visual.moving ? Math.sin(visual.time * 9) * 0.55 : 0;
  joints.leftArm.rotation.x = THREE.MathUtils.lerp(joints.leftArm.rotation.x, swing, visual.moving ? 1 : damping);
  joints.rightArm.rotation.x = THREE.MathUtils.lerp(joints.rightArm.rotation.x, -swing, visual.moving ? 1 : damping);
  joints.leftLeg.rotation.x = THREE.MathUtils.lerp(joints.leftLeg.rotation.x, -swing * 0.8, visual.moving ? 1 : damping);
  joints.rightLeg.rotation.x = THREE.MathUtils.lerp(joints.rightLeg.rotation.x, swing * 0.8, visual.moving ? 1 : damping);
  joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, visual.moving ? Math.sin(visual.time * 2.2) * 0.25 : 0, damping);
  model.userData.bodyBob = visual.moving ? Math.abs(Math.sin(visual.time * 9)) * 0.04 : 0;
  if (model.userData.carrying) model.userData.carrying.visible = Boolean(visual.carrying);
  if (model.userData.cooking) {
    model.userData.cooking.visible = Boolean(visual.cooking);
    if (visual.cooking) model.userData.cooking.rotation.y = visual.time * 3;
  }
  const showPatience = visual.patience !== undefined;
  model.userData.patienceBack.visible = showPatience;
  model.userData.patienceFill.visible = showPatience;
  if (showPatience) {
    const fraction = THREE.MathUtils.clamp(visual.patience!, 0, 1);
    model.userData.patienceFill.scale.x = Math.max(fraction, 0.001);
    model.userData.patienceFill.material.color.setHex(fraction > 0.5 ? 0x62bd68 : fraction > 0.2 ? 0xe8bc4d : 0xd95852);
  }
}
