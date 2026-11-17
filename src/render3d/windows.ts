import * as THREE from 'three';
import { windowById } from '../content/windows';
import type { GameState } from '../simulation/types';
import { wallTargets } from './wallpapers';
import { placeWallDecoration } from './wallDecorationPlacement';

export function createWindowLayer(state: GameState): THREE.Group {
  const group = new THREE.Group(); group.name = 'window-layer';
  const targets = wallTargets(state.width, state.height);
  for (const placed of state.appliedWindows ?? []) {
    const item = windowById(placed.windowId);
    const target = targets.find((candidate) => candidate.id === `${placed.side}-${placed.index}`);
    if (!item || !target) continue;
    const holder = new THREE.Group();
    holder.name = placed.id;
    holder.userData.wallDecorationId = placed.id;
    holder.userData.wallDecorationKind = 'window';
    const frame = new THREE.MeshStandardMaterial({ color: item.colors[0], roughness: 0.65 });
    const glass = new THREE.MeshStandardMaterial({ color: item.colors[1], roughness: 0.25, metalness: 0.08 });
    const accent = new THREE.MeshStandardMaterial({ color: item.colors[2], roughness: 0.55 });
    const addBox = (w: number, h: number, d: number, x: number, y: number, material: THREE.Material, z = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); holder.add(mesh); return mesh;
    };
    if (item.motif === 'round') {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 8, 24), frame); rim.position.y = 0.12; holder.add(rim);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), glass); pane.position.set(0, 0.12, 0.012); holder.add(pane);
      addBox(0.035, 0.55, 0.035, 0, 0.12, accent, 0.025); addBox(0.55, 0.035, 0.035, 0, 0.12, accent, 0.025);
    } else {
      const height = item.motif === 'arch' ? 0.59 : item.motif === 'panorama' ? 0.72 : 0.62;
      const width = item.motif === 'panorama' ? 0.82 : 0.65;
      addBox(width + 0.1, height + 0.1, 0.06, 0, 0.12, frame);
      addBox(width, height, 0.025, 0, 0.12, glass, 0.038);
      if (item.motif === 'arch') {
        const cap = new THREE.Mesh(new THREE.CircleGeometry(width / 2, 20, 0, Math.PI), glass); cap.position.set(0, 0.12 + height / 2, 0.04); holder.add(cap);
        const arc = new THREE.Mesh(new THREE.TorusGeometry(width / 2 + 0.045, 0.045, 6, 20, Math.PI), frame); arc.position.set(0, 0.12 + height / 2, 0.025); holder.add(arc);
      }
      addBox(item.motif === 'panorama' ? 0.035 : 0.045, height, 0.035, 0, 0.12, frame, 0.06);
      if (item.motif !== 'panorama') addBox(width, 0.04, 0.035, 0, 0.12, frame, 0.06);
      if (item.motif === 'stained') {
        for (const [x, y] of [[-0.16, 0.27], [0.16, -0.03]]) addBox(0.19, 0.19, 0.01, x, y, accent, 0.058);
      }
      if (item.motif === 'wood') addBox(width + 0.16, 0.07, 0.16, 0, -0.23, accent, 0.04);
    }
    const centeredTarget = { ...target, position: target.position.clone() };
    if (item.widthCells > 1) {
      const next = targets.find((candidate) => candidate.id === `${placed.side}-${placed.index + 1}`);
      if (next) centeredTarget.position.add(next.position).multiplyScalar(0.5);
    }
    placeWallDecoration(holder, centeredTarget, item.widthCells, item.heightCells, 0.045);
    group.add(holder);
  }
  return group;
}
