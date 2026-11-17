import * as THREE from 'three';
import { createPaintingCanvas, paintingById } from '../content/paintings';
import type { GameState } from '../simulation/types';
import { wallTargets } from './wallpapers';
import { placeWallDecoration } from './wallDecorationPlacement';

export function createPaintingLayer(state: GameState): THREE.Group {
  const group = new THREE.Group(); group.name = 'painting-layer';
  const targets = wallTargets(state.width, state.height);
  for (const placed of state.appliedPaintings) {
    const painting = paintingById(placed.paintingId);
    const target = targets.find((item) => item.id === `${placed.side}-${placed.index}`);
    if (!painting || !target) continue;
    const holder = new THREE.Group(); holder.name = placed.id; holder.userData.paintingId = placed.id;
    holder.userData.wallDecorationId = placed.id; holder.userData.wallDecorationKind = 'painting';
    const width = 0.82;
    const height = 0.7;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.07), new THREE.MeshStandardMaterial({ color: 0x6f472d, roughness: 0.72 }));
    holder.add(frame);
    const texture = new THREE.CanvasTexture(createPaintingCanvas(painting.id)); texture.colorSpace = THREE.SRGBColorSpace;
    const image = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
    image.position.z = 0.041; image.renderOrder = 3; holder.add(image);
    const centeredTarget = { ...target, position: target.position.clone() };
    if (painting.widthCells > 1) {
      const next = targets.find((item) => item.id === `${placed.side}-${placed.index + 1}`);
      if (next) centeredTarget.position.add(next.position).multiplyScalar(0.5);
    }
    placeWallDecoration(holder, centeredTarget, painting.widthCells, painting.heightCells, 0.04);
    group.add(holder);
  }
  return group;
}
