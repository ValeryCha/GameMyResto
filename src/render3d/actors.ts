import * as THREE from 'three';

export interface ActorVisualState {
  moving: boolean;
  time: number;
  delta: number;
  patience?: number;
  seated?: boolean;
  carrying?: boolean;
  cooking?: boolean;
}

export function updateActorVisual(model: THREE.Group, visual: ActorVisualState): void {
  const joints = model.userData.joints as Record<string, THREE.Object3D>;
  const damping = 1 - Math.exp(-10 * visual.delta);
  const swing = visual.moving && !visual.seated ? Math.sin(visual.time * 9) * 0.55 : 0;
  joints.leftArm.rotation.x = THREE.MathUtils.lerp(joints.leftArm.rotation.x, swing, visual.moving ? 1 : damping);
  joints.rightArm.rotation.x = THREE.MathUtils.lerp(joints.rightArm.rotation.x, -swing, visual.moving ? 1 : damping);
  const legTarget = visual.seated ? -Math.PI / 2 : 0;
  joints.leftLeg.rotation.x = THREE.MathUtils.lerp(joints.leftLeg.rotation.x, visual.seated ? legTarget : -swing * 0.8, visual.seated ? 1 : visual.moving ? 1 : damping);
  joints.rightLeg.rotation.x = THREE.MathUtils.lerp(joints.rightLeg.rotation.x, visual.seated ? legTarget : swing * 0.8, visual.seated ? 1 : visual.moving ? 1 : damping);
  joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, visual.moving ? Math.sin(visual.time * 2.2) * 0.25 : 0, damping);
  model.userData.seatOffset = THREE.MathUtils.lerp(model.userData.seatOffset ?? 0, visual.seated ? 0.22 : 0, damping);
  model.userData.bodyBob = visual.moving && !visual.seated ? Math.abs(Math.sin(visual.time * 9)) * 0.04 : 0;
  if (model.userData.carrying) model.userData.carrying.visible = Boolean(visual.carrying);
  if (model.userData.cooking) model.userData.cooking.visible = false;
  const ring = model.userData.patienceRing as THREE.Mesh;
  ring.visible = visual.patience !== undefined;
  if (visual.patience !== undefined) {
    const fraction = THREE.MathUtils.clamp(visual.patience, 0, 1);
    ring.geometry.setDrawRange(0, Math.max(6, Math.floor(fraction * 40) * 6));
    (ring.material as THREE.MeshBasicMaterial).color.setHex(fraction > 0.5 ? 0x62bd68 : fraction > 0.2 ? 0xe8bc4d : 0xd95852);
  }
}
