import * as THREE from 'three';
import { createWallpaperCanvas, wallpaperById } from '../content/wallpapers';
import type { GameState } from '../simulation/types';

export interface WallTarget {
  id: string;
  position: THREE.Vector3;
  rotationY: number;
  height: number;
}

export function wallTargets(width: number, height: number): WallTarget[] {
  const targets: WallTarget[] = [];
  for (let start = 0; start < width; start += 1) {
    const x = start - 3;
    targets.push(
      { id: `north-${start}`, position: new THREE.Vector3(x, 1.08, -3.94), rotationY: 0, height: 1.82 },
      { id: `south-${start}`, position: new THREE.Vector3(x, 0.48, height - 4.06), rotationY: Math.PI, height: 0.66 },
    );
  }
  for (let start = 0; start < height; start += 1) {
    const z = start - 3;
    targets.push(
      { id: `west-${start}`, position: new THREE.Vector3(-3.94, 1.08, z), rotationY: Math.PI / 2, height: 1.82 },
      { id: `east-${start}`, position: new THREE.Vector3(width - 4.06, 0.48, z), rotationY: -Math.PI / 2, height: 0.66 },
    );
  }
  return targets;
}

const textures = new Map<string, THREE.CanvasTexture>();
function texture(wallpaperId: string): THREE.CanvasTexture {
  let value = textures.get(wallpaperId);
  if (!value) {
    value = new THREE.CanvasTexture(createWallpaperCanvas(wallpaperId));
    value.colorSpace = THREE.SRGBColorSpace;
    value.wrapS = THREE.RepeatWrapping;
    value.wrapT = THREE.RepeatWrapping;
    value.repeat.set(1, 2);
    textures.set(wallpaperId, value);
  }
  return value;
}

export function createWallpaperLayer(state: GameState): THREE.Group {
  const group = new THREE.Group();
  group.name = 'wallpaper-layer';
  for (const target of wallTargets(state.width, state.height)) {
    const wallpaperId = state.appliedWallpapers.find((item) => item.wallCellId === target.id)?.wallpaperId;
    const wallpaper = wallpaperId ? wallpaperById(wallpaperId) : undefined;
    const material = new THREE.MeshBasicMaterial({
      map: wallpaper ? texture(wallpaper.id) : null,
      color: wallpaper ? 0xffffff : 0x000000,
      transparent: true,
      opacity: wallpaper ? 1 : 0,
      depthWrite: Boolean(wallpaper),
      side: THREE.DoubleSide,
    });
    const match = /^(north|south|west|east)-(\d+)$/.exec(target.id)!;
    const index = Number(match[2]);
    const length = match[1] === 'north' || match[1] === 'south' ? state.width : state.height;
    // Первый сегмент продолжается до самого стыка стен: узкая панель 0.96 оставляла угол без raycast-цели.
    const panelWidth = index === 0 ? 1.64 : index === length - 1 ? 0.64 : 1;
    const cornerOffset = index === 0 ? -0.32 : index === length - 1 ? -0.18 : 0;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, target.height), material);
    panel.position.copy(target.position);
    if (match[1] === 'north' || match[1] === 'south') panel.position.x += cornerOffset;
    else panel.position.z += cornerOffset;
    panel.rotation.y = target.rotationY;
    panel.userData.wallCellId = target.id;
    panel.userData.wallpaperTarget = true;
    panel.name = target.id;
    group.add(panel);
  }
  return group;
}
