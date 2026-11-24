import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISHES } from '../content/dishes';
import type { Customer, Employee, Furniture } from '../simulation/types';
import { gridToWorld } from './coordinates';
import { box, cylinder, sphere } from './materials';
import type { RestaurantSkin } from './skins';
import { doorPatternById } from '../content/doors';
import { furnitureSkinById } from '../content/furnitureSkins';
import { createCounterPlateSlots } from './counterPlates';

const wood = 0x8b5136;
const darkWood = 0x57392e;
const cream = 0xfff0cf;
const metal = 0x7e8b91;
const dark = 0x30383b;

function skinColors(skinId?: string) {
  const skin = skinId ? furnitureSkinById(skinId) : undefined;
  return {
    primary: skin ? Number.parseInt(skin.primary.slice(1), 16) : wood,
    secondary: skin ? Number.parseInt(skin.secondary.slice(1), 16) : darkWood,
    accent: skin ? Number.parseInt(skin.accent.slice(1), 16) : cream,
    style: skin?.style ?? 'classic',
  };
}

function tableModel(skinId?: string): THREE.Group {
  const group = new THREE.Group();
  const colors = skinColors(skinId);
  box(group, [0.84, 0.12, 0.84], [0, 0.68, 0], colors.primary);
  cylinder(group, colors.style === 'modern' ? 0.15 : 0.1, 0.58, [0, 0.34, 0], colors.secondary);
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) box(group, [0.1, 0.08, 0.1], [x, 0.06, z], colors.secondary);
  cylinder(group, 0.17, 0.025, [0, 0.755, 0], colors.accent);
  if (colors.style === 'royal') for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) sphere(group, 0.035, [x, 0.76, z], colors.secondary);
  return group;
}

function doubleTableModel(skinId?: string): THREE.Group {
  const group = new THREE.Group();
  const colors = skinColors(skinId);
  box(group, [1.84, 0.12, 0.84], [0, 0.68, 0], colors.primary);
  for (const x of [-0.48, 0.48]) cylinder(group, colors.style === 'modern' ? 0.15 : 0.1, 0.58, [x, 0.34, 0], colors.secondary);
  for (const x of [-0.48, 0.48]) cylinder(group, 0.17, 0.025, [x, 0.755, 0], colors.accent);
  if (colors.style === 'royal') box(group, [1.7, 0.035, 0.06], [0, 0.77, 0], colors.secondary);
  return group;
}

function chairModel(skinId?: string): THREE.Group {
  const group = new THREE.Group();
  const colors = skinColors(skinId);
  box(group, [0.54, 0.12, 0.54], [0, 0.4, 0], colors.primary);
  box(group, [0.54, 0.55, 0.09], [0, 0.73, 0.23], colors.primary);
  box(group, [0.42, 0.3, 0.035], [0, 0.76, 0.175], colors.accent);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(group, [0.08, 0.4, 0.08], [x, 0.2, z], colors.secondary);
  if (colors.style === 'royal') sphere(group, 0.07, [0, 1.04, 0.23], colors.secondary);
  return group;
}

function stoveModel(skinId?: string): THREE.Group {
  const group = new THREE.Group();
  const colors = skinColors(skinId);
  box(group, [0.9, 0.78, 0.8], [0, 0.4, 0], colors.primary);
  box(group, [0.92, 0.09, 0.82], [0, 0.82, 0], colors.secondary);
  for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) {
    cylinder(group, skinId === 'electricStove' || skinId === 'futureStove' ? 0.14 : 0.13, 0.035, [x, 0.885, z], skinId === 'futureStove' ? colors.accent : 0x161b1d);
  }
  if (skinId === 'grillStove') for (let x = -0.35; x <= 0.35; x += 0.14) box(group, [0.045, 0.05, 0.7], [x, 0.9, 0], colors.accent);
  if (skinId === 'stoneOven') {
    box(group, [0.68, 0.52, 0.06], [0, 0.43, 0.42], colors.secondary);
    box(group, [0.5, 0.35, 0.07], [0, 0.4, 0.46], 0x201b18);
  } else box(group, [0.54, 0.35, 0.025], [0, 0.4, 0.413], colors.secondary);
  if (skinId === 'futureStove') box(group, [0.82, 0.055, 0.04], [0, 0.72, 0.43], colors.accent);
  for (const x of [-0.25, 0, 0.25]) cylinder(group, 0.045, 0.05, [x, 0.69, 0.43], colors.accent).rotation.x = Math.PI / 2;
  const pan = new THREE.Group();
  cylinder(pan, 0.19, 0.065, [-0.22, 0.97, -0.2], 0x252b2d);
  box(pan, [0.3, 0.045, 0.07], [-0.22, 0.98, 0.04], dark);
  pan.visible = false; group.add(pan);
  const flame = new THREE.Group();
  for (const [x, z, height, color] of [[-0.28, -0.2, 0.12, 0xff9d32], [-0.17, -0.2, 0.15, 0xffc438], [-0.22, -0.13, 0.11, 0xff7728]] as const) cylinder(flame, 0.045, height, [x, 0.91, z], color, 0.005);
  flame.visible = false; group.add(flame); group.userData.pan = pan; group.userData.flame = flame;
  return group;
}

function plantModel(): THREE.Group {
  const group = new THREE.Group();
  cylinder(group, 0.22, 0.38, [0, 0.2, 0], 0xb65d3f, 0.29);
  cylinder(group, 0.3, 0.07, [0, 0.4, 0], 0xd37a51);
  cylinder(group, 0.055, 0.6, [0, 0.68, 0], 0x49643c);
  for (const [x, y, z] of [[0, 1.05, 0], [-0.2, 0.83, 0], [0.2, 0.84, 0], [0, 0.83, -0.2], [0, 0.8, 0.2]]) {
    sphere(group, 0.25, [x, y, z], 0x4e8b4d, [0.75, 1.35, 0.65]);
  }
  return group;
}

function counterModel(skinId?: string): THREE.Group {
  const group = new THREE.Group();
  const colors = skinColors(skinId);
  box(group, [0.9, 0.72, 0.72], [0, 0.36, 0], colors.primary);
  box(group, [0.98, 0.1, 0.8], [0, 0.77, 0], colors.accent);
  box(group, [0.72, 0.08, 0.03], [0, 0.48, 0.375], colors.secondary);
  if (skinId === 'neonCounter') box(group, [0.84, 0.055, 0.04], [0, 0.62, 0.39], colors.accent);
  if (skinId === 'metalCounter') for (const x of [-0.34, 0.34]) for (const y of [0.18, 0.56]) sphere(group, 0.025, [x, y, 0.38], colors.accent);
  if (skinId === 'vintageCounter') for (const x of [-0.28, 0, 0.28]) box(group, [0.04, 0.56, 0.035], [x, 0.36, 0.39], colors.secondary);
  const counterPlates = createCounterPlateSlots();
  group.add(...counterPlates);
  group.userData.counterPlates = counterPlates;
  return group;
}

function doorModel(patternId?: string | null): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.12, 1.65, 0.14], [-0.45, 0.83, 0], darkWood);
  box(group, [0.12, 1.65, 0.14], [0.45, 0.83, 0], darkWood);
  box(group, [1.02, 0.16, 0.16], [0, 1.63, 0], darkWood);
  const leaf = new THREE.Group();
  leaf.name = 'doorLeaf';
  leaf.position.set(-0.39, 0, 0.05);
  const pattern = patternId ? doorPatternById(patternId) : undefined;
  const doorColor = pattern ? Number.parseInt(pattern.color.slice(1), 16) : wood;
  box(leaf, [0.75, 1.4, 0.07], [0.375, 0.76, 0], doorColor);
  if (patternId === 'glass') box(leaf, [0.56, 1.08, 0.025], [0.375, 0.82, 0.055], 0xa5d9dc);
  if (patternId === 'stained') for (const [x, y, color] of [[0.23, 1.05, 0xd8a64d], [0.52, 1.05, 0x6d3c64], [0.23, 0.62, 0x4c8b83], [0.52, 0.62, 0xa54d42]] as const) box(leaf, [0.25, 0.36, 0.025], [x, y, 0.055], color);
  if (patternId === 'metal') for (const y of [0.25, 0.75, 1.25]) for (const x of [0.08, 0.67]) sphere(leaf, 0.025, [x, y, 0.06], 0xc0c8ca);
  if (patternId === 'carved') {
    for (const y of [0.48, 1.03]) {
      const ornament = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc79a46 }));
      ornament.position.set(0.375, y, 0.06); ornament.scale.y = 1.35; leaf.add(ornament);
    }
  }
  sphere(leaf, 0.05, [0.64, 0.8, 0.06], 0xe7bd52);
  group.add(leaf);
  group.userData.doorLeaf = leaf;
  return group;
}

export function updateDoorVisual(model: THREE.Group, open: boolean, delta: number): void {
  const leaf = model.userData.doorLeaf as THREE.Group | undefined;
  if (!leaf) return;
  leaf.rotation.y = THREE.MathUtils.damp(leaf.rotation.y, open ? Math.PI * 0.48 : 0, 9, delta);
}

export function createFurnitureMesh(item: Furniture, skin: RestaurantSkin, doorPatternId?: string | null, furnitureSkinId?: string): THREE.Group {
  const group = item.kind === 'table' ? tableModel(furnitureSkinId)
    : item.kind === 'tableDouble' ? doubleTableModel(furnitureSkinId)
    : item.kind === 'chair' ? chairModel(furnitureSkinId)
      : item.kind === 'stove' ? stoveModel(furnitureSkinId)
        : item.kind === 'counter' ? counterModel(furnitureSkinId)
          : item.kind === 'plant' ? plantModel() : doorModel(doorPatternId);
  const doubleStove = item.kind === 'stove' && furnitureSkinId === 'industrialStove';
  if (doubleStove) group.scale.x = 1.85;
  const position = gridToWorld(item.position);
  const doubleItem = item.kind === 'tableDouble' || doubleStove;
  const verticalDouble = doubleItem && (item.rotation === 90 || item.rotation === 270);
  group.position.set(position.x + (doubleItem && !verticalDouble ? 0.5 : 0), 0.09, position.z + (verticalDouble ? 0.5 : 0));
  group.rotation.y = item.rotation * Math.PI / 180;
  group.userData.entityId = item.id;
  group.userData.skinId = skin.id;
  return group;
}

function addHair(head: THREE.Group, style: string, color: number): void {
  const hair = new THREE.Group();
  hair.name = `hair-${style}`;
  sphere(hair, 0.21, [0, 0.11, -0.04], color, [1, 0.48, 1]);
  if (style === 'long') {
    sphere(hair, 0.19, [0, -0.08, -0.15], color, [1.05, 1.7, 0.65]);
    sphere(hair, 0.09, [-0.18, -0.08, 0], color, [0.7, 1.8, 0.8]);
    sphere(hair, 0.09, [0.18, -0.08, 0], color, [0.7, 1.8, 0.8]);
  } else if (style === 'bun') {
    sphere(hair, 0.12, [0, 0.29, -0.06], color);
  } else if (style === 'ponytail') {
    sphere(hair, 0.1, [0, 0.01, -0.25], color, [0.8, 1.8, 0.8]);
  } else if (style === 'curly') {
    for (const [x, y, z] of [[-0.15, 0.16, 0], [0, 0.21, 0], [0.15, 0.16, 0], [-0.18, 0.04, -0.08], [0.18, 0.04, -0.08], [0, 0.13, -0.16]]) {
      sphere(hair, 0.11, [x, y, z], color);
    }
  }
  head.add(hair);
}

function paintDesireBadge(canvas: HTMLCanvasElement, label: string): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(61, 38, 30, 0.92)';
  context.fillRect(8, 8, 496, 112);
  context.strokeStyle = '#ffd45e';
  context.lineWidth = 6;
  context.strokeRect(8, 8, 496, 112);
  context.fillStyle = '#fff7df';
  context.font = 'bold 42px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 256, 66, 460);
}

export function updateDesireBadge(badge: THREE.Group, dishId?: string): void {
  const dishName = DISHES.find((dish) => dish.id === dishId)?.name;
  const label = `★ ${dishName ?? 'Желание'}`;
  if (badge.userData.label === label) return;
  badge.userData.label = label;
  const sprite = badge.children.find((child) => child.userData.desireLabel) as THREE.Sprite | undefined;
  const material = sprite?.material as THREE.SpriteMaterial | undefined;
  const canvas = material?.map?.image as HTMLCanvasElement | undefined;
  if (canvas) {
    paintDesireBadge(canvas, label);
    if (material?.map) material.map.needsUpdate = true;
  }
}

function createDesireBadge(actor: Employee | Customer): THREE.Group {
  const badge = new THREE.Group();
  badge.name = 'desireBadge';
  badge.position.set(0, 1.72, 0);
  const dishId = 'desiredDishId' in actor ? actor.desiredDishId : undefined;
  updateDesireBadge(badge, dishId);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffd45e, depthTest: false }));
  star.renderOrder = 30;
  badge.add(star);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    paintDesireBadge(canvas, badge.userData.label);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
    sprite.scale.set(2.1, 0.52, 1);
    sprite.renderOrder = 31;
    sprite.userData.desireLabel = true;
    badge.add(sprite);
    star.visible = false;
  }
  badge.visible = false;
  return badge;
}

export function createActorMesh(actor: Employee | Customer, appliedSkinId?: string): THREE.Group {
  const group = new THREE.Group();
  const chef = 'role' in actor && actor.role === 'chef';
  const waiter = 'role' in actor && actor.role === 'waiter';
  const isCustomer = !('role' in actor);
  const uniform = skinColors(appliedSkinId);
  const appearance = {
    bodyType: isCustomer ? actor.bodyType ?? 'masculine' : 'masculine',
    hairStyle: isCustomer ? actor.hairStyle ?? 'short' : 'short',
    hairColor: isCustomer ? actor.hairColor ?? 0x5b3c2d : 0x5b3c2d,
    skinColor: isCustomer ? actor.skinColor ?? 0xf2c39c : 0xf2c39c,
    outfitColor: isCustomer ? actor.outfitColor ?? 0xd56b75 : 0xd56b75,
  };
  const clothes = chef || waiter ? uniform.primary : appearance.outfitColor;
  const makeJoint = (name: string, x: number, y: number) => {
    const joint = new THREE.Group(); joint.name = name; joint.position.set(x, y, 0); group.add(joint); return joint;
  };
  const leftLeg = makeJoint('leftLeg', -0.1, 0.4);
  const rightLeg = makeJoint('rightLeg', 0.1, 0.4);
  cylinder(leftLeg, 0.075, 0.35, [0, -0.175, 0], chef || waiter ? uniform.secondary : dark);
  cylinder(rightLeg, 0.075, 0.35, [0, -0.175, 0], chef || waiter ? uniform.secondary : dark);
  if (isCustomer && appearance.bodyType === 'feminine') {
    const outfit = new THREE.Group(); outfit.name = 'feminine-outfit';
    cylinder(outfit, 0.29, 0.34, [0, 0.47, 0], clothes, 0.2);
    cylinder(outfit, 0.2, 0.32, [0, 0.76, 0], clothes, 0.17); group.add(outfit);
  } else cylinder(group, 0.25, 0.5, [0, 0.58, 0], clothes, 0.2);
  if (chef) {
    box(group, [0.38, 0.36, 0.035], [0, 0.53, 0.205], uniform.secondary);
    if (appliedSkinId === 'goldChef') for (const y of [0.48, 0.64, 0.8]) sphere(group, 0.025, [0.1, y, 0.22], uniform.accent);
    if (appliedSkinId === 'streetChef') box(group, [0.46, 0.09, 0.04], [0, 0.82, 0.19], uniform.accent);
    if (appliedSkinId === 'pastryChef') box(group, [0.09, 0.48, 0.04], [-0.08, 0.65, 0.21], uniform.accent);
  }
  if (waiter) {
    const vest = new THREE.Group(); vest.name = 'waiter-vest';
    box(vest, [0.38, 0.28, 0.035], [0, 0.68, 0.18], uniform.secondary); group.add(vest);
    const apron = new THREE.Group(); apron.name = 'waiter-apron';
    box(apron, [0.34, 0.37, 0.035], [0, 0.46, 0.205], uniform.accent); group.add(apron);
    const bowtie = new THREE.Group(); bowtie.name = 'waiter-bowtie';
    box(bowtie, [0.11, 0.065, 0.045], [-0.052, 0.85, 0.205], appliedSkinId === 'bowWaiter' || appliedSkinId === 'retroWaiter' ? uniform.accent : uniform.secondary);
    box(bowtie, [0.11, 0.065, 0.045], [0.052, 0.85, 0.205], appliedSkinId === 'bowWaiter' || appliedSkinId === 'retroWaiter' ? uniform.accent : uniform.secondary); group.add(bowtie);
    if (appliedSkinId === 'modernWaiter') box(group, [0.06, 0.35, 0.04], [0, 0.65, 0.23], uniform.accent);
  }
  const leftArm = makeJoint('leftArm', -0.26, 0.82);
  const rightArm = makeJoint('rightArm', 0.26, 0.82);
  cylinder(leftArm, 0.065, 0.4, [0, -0.2, 0], appearance.skinColor);
  cylinder(rightArm, 0.065, 0.4, [0, -0.2, 0], appearance.skinColor);
  const head = makeJoint('head', 0, 1.02);
  sphere(head, 0.22, [0, 0, 0], appearance.skinColor); addHair(head, appearance.hairStyle, appearance.hairColor);
  if (chef) {
    cylinder(head, appliedSkinId === 'streetChef' ? 0.24 : 0.23, appliedSkinId === 'pastryChef' ? 0.3 : 0.22, [0, 0.23, 0], uniform.accent);
    sphere(head, 0.24, [0, 0.36, 0], uniform.accent, [1, appliedSkinId === 'pastryChef' ? 0.9 : 0.6, 1]);
  }
  if (appliedSkinId === 'retroWaiter') cylinder(head, 0.25, 0.08, [0, 0.18, 0], uniform.secondary);
  const carrying = new THREE.Group();
  carrying.position.set(0.3, 0.75, -0.16);
  cylinder(carrying, 0.19, 0.025, [0, 0, 0], cream);
  carrying.visible = false;
  group.add(carrying);
  const cooking = new THREE.Group();
  cooking.position.set(-0.3, 0.72, -0.14);
  cylinder(cooking, 0.17, 0.07, [0, 0, 0], dark);
  box(cooking, [0.28, 0.04, 0.05], [-0.19, 0, 0], darkWood);
  cooking.visible = false;
  group.add(cooking);
  const patienceRing = new THREE.Mesh(
    new THREE.RingGeometry(0.31, 0.39, 40),
    new THREE.MeshBasicMaterial({ color: 0x62bd68, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
  );
  patienceRing.renderOrder = 20;
  patienceRing.rotation.x = -Math.PI / 2;
  patienceRing.position.y = 0.015;
  patienceRing.visible = false;
  group.add(patienceRing);
  const patienceAlert = new THREE.Group();
  patienceAlert.position.set(0, 1.45, 0);
  box(patienceAlert, [0.08, 0.24, 0.08], [0, 0.08, 0], 0xd95852);
  sphere(patienceAlert, 0.065, [0, -0.11, 0], 0xd95852);
  patienceAlert.visible = false;
  group.add(patienceAlert);
  const desireBadge = createDesireBadge(actor);
  group.add(desireBadge);
  group.userData.patienceAlert = patienceAlert;
  group.userData.desireBadge = desireBadge;
  group.userData.appearance = appearance;
  group.userData.entityId = actor.id;
  group.userData.joints = { leftArm, rightArm, leftLeg, rightLeg, head };
  group.userData.carrying = carrying;
  group.userData.cooking = cooking;
  group.userData.patienceRing = patienceRing;
  group.userData.seatOffset = 0;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
  return group;
}

export function createCrowdActorMesh(actor: Employee | Customer, appliedSkinId?: string): THREE.Group {
  const group = createActorMesh(actor, appliedSkinId);
  const dynamic = new Set<THREE.Object3D>([
    group.userData.carrying,
    group.userData.cooking,
    group.userData.patienceRing,
    group.userData.patienceAlert,
    group.userData.desireBadge,
  ]);
  const pieces: THREE.BufferGeometry[] = [];
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    let ancestor: THREE.Object3D | null = object;
    while (ancestor && ancestor !== group) {
      if (dynamic.has(ancestor)) return;
      ancestor = ancestor.parent;
    }
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const sourceMaterial = object.material as THREE.MeshStandardMaterial;
    const color = sourceMaterial.color ?? new THREE.Color(0xffffff);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pieces.push(geometry);
  });
  for (const child of [...group.children]) {
    if (!dynamic.has(child)) group.remove(child);
  }
  const geometry = mergeGeometries(pieces, false);
  if (!geometry) throw new Error('Не удалось объединить модель гостя');
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02 }));
  body.name = 'crowd-body';
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);
  group.userData.joints = Object.fromEntries(['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'head'].map((name) => [name, new THREE.Group()]));
  group.userData.crowd = true;
  return group;
}

export function createRestaurantShell(width: number, height: number, skin: RestaurantSkin): THREE.Group {
  const group = new THREE.Group();
  group.userData.skinId = skin.id;
  group.userData.width = width;
  group.userData.height = height;
  const offsetX = (width - 8) / 2;
  const offsetZ = (height - 8) / 2;
  box(group, [width + 0.5, 0.35, height + 0.5], [offsetX, -0.22, offsetZ], skin.facade);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const p = gridToWorld({ x, y });
    const color = new THREE.Color(skin.floor).offsetHSL(0, 0, (x + y) % 2 ? 0.035 : -0.015).getHex();
    box(group, [0.98, 0.12, 0.98], [p.x, 0, p.z], color);
  }
  box(group, [width + 0.25, 2.2, 0.18], [offsetX, 1.05, -4.05], skin.wall);
  box(group, [0.18, 2.2, height + 0.25], [-4.05, 1.05, offsetZ], skin.wall);
  box(group, [width + 0.3, 0.16, 0.25], [offsetX, 0.14, -3.96], skin.trim);
  box(group, [0.25, 0.16, height + 0.3], [-3.96, 0.14, offsetZ], skin.trim);
  box(group, [width + 0.4, 0.18, 0.3], [offsetX, 2.18, -4.05], skin.trim);
  box(group, [0.3, 0.18, height + 0.4], [-4.05, 2.18, offsetZ], skin.trim);
  for (const x of [-2.2, 1.5]) {
    box(group, [1.65, 1.15, 0.07], [x, 1.2, -3.94], 0x9dd4d7);
    box(group, [1.8, 0.1, 0.12], [x, 1.8, -3.9], skin.trim);
    box(group, [0.09, 1.2, 0.12], [x, 1.2, -3.9], skin.trim);
  }
  box(group, [2.25, 0.52, 0.18], [offsetX + 0.3, 2.55, -4.02], skin.facade);
  box(group, [1.75, 0.12, 0.2], [offsetX + 0.3, 2.55, -3.91], cream);
  return group;
}
