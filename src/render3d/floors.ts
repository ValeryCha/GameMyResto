import * as THREE from 'three';
import { createFloorCanvas, floorPatternById } from '../content/floors';
import type { GameState } from '../simulation/types';

export function createFloorLayer(state: GameState): THREE.Mesh | null {
  const floor = state.activeFloorPattern ? floorPatternById(state.activeFloorPattern) : undefined;
  if (!floor) return null;
  const texture = new THREE.CanvasTexture(createFloorCanvas(floor.id));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(state.width / 2, state.height / 2);
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(state.width, state.height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: floor.id === 'whiteMarble' ? 0.35 : 0.88 }),
  );
  mesh.name = 'floor-pattern';
  mesh.userData.floorPattern = floor.id;
  mesh.position.set((state.width - 8) / 2, 0.075, (state.height - 8) / 2);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
