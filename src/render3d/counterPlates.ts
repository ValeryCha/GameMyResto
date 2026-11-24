import * as THREE from 'three';
import { DISHES } from '../content/dishes';

const SLOT_OFFSETS = [
  { x: -0.10, z: 0.08 },
  { x: 0.10, z: 0.08 },
  { x: 0, z: -0.08 },
] as const;

const textureCache = new Map<string, THREE.CanvasTexture>();

function dishTexture(emoji: string): THREE.CanvasTexture {
  const cached = textureCache.get(emoji);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, 64, 64);
  context.font = '48px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emoji, 32, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(emoji, texture);
  return texture;
}

/** Три локальных слота; поворот родительской стойки поворачивает и треугольник. */
export function createCounterPlateSlots(): THREE.Group[] {
  return SLOT_OFFSETS.map(({ x, z }) => {
    const slot = new THREE.Group();
    slot.position.set(x, 0, z);
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.015, 24),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.72 }),
    );
    plate.position.y = 0.835;
    plate.castShadow = true;
    plate.receiveShadow = true;
    const emoji = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    emoji.position.y = 0.85;
    emoji.rotation.x = -Math.PI / 2;
    emoji.renderOrder = 2;
    slot.userData.emojiPlane = emoji;
    slot.add(plate, emoji);
    slot.visible = false;
    return slot;
  });
}

export function syncCounterPlates(counter: THREE.Group, dishIds: string[]): void {
  const slots = counter.userData.counterPlates as THREE.Group[] | undefined;
  if (!slots) return;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const dishId = dishIds[index];
    slot.visible = Boolean(dishId);
    if (!dishId || slot.userData.dishId === dishId) continue;
    slot.userData.dishId = dishId;
    const emoji = DISHES.find((dish) => dish.id === dishId)?.emoji ?? '🍽';
    const plane = slot.userData.emojiPlane as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    plane.material.map = dishTexture(emoji);
    plane.material.needsUpdate = true;
  }
}
