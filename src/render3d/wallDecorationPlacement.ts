import * as THREE from 'three';
import type { WallTarget } from './wallpapers';

/** Центрирует содержимое в выделенных клетках и ставит его вплотную к плоскости обоев. */
export function placeWallDecoration(
  holder: THREE.Group,
  target: WallTarget,
  widthCells: number,
  heightCells: number,
  surfaceOffset: number,
): void {
  holder.updateMatrixWorld(true);
  const contentBounds = new THREE.Box3().setFromObject(holder);
  const contentCenter = contentBounds.getCenter(new THREE.Vector3());
  for (const child of holder.children) {
    child.position.x -= contentCenter.x;
    child.position.y -= contentCenter.y;
  }

  holder.scale.set(widthCells, heightCells, 1);
  holder.updateMatrixWorld(true);
  const scaledSize = new THREE.Box3().setFromObject(holder).getSize(new THREE.Vector3());
  const fit = Math.min(1, widthCells * 0.9 / scaledSize.x, target.height * 0.9 / scaledSize.y);
  holder.scale.multiplyScalar(fit);
  holder.position.copy(target.position);
  holder.rotation.y = target.rotationY;
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(holder.quaternion);
  holder.position.addScaledVector(normal, surfaceOffset);
}
