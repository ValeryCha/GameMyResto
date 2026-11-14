import * as THREE from 'three';
import type { Customer, Employee, Furniture } from '../simulation/types';
import { gridToWorld } from './coordinates';
import { box, cylinder, sphere } from './materials';
import type { RestaurantSkin } from './skins';

const wood = 0x8b5136;
const darkWood = 0x57392e;
const cream = 0xfff0cf;
const metal = 0x7e8b91;
const dark = 0x30383b;

function tableModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.84, 0.12, 0.84], [0, 0.68, 0], wood);
  cylinder(group, 0.1, 0.58, [0, 0.34, 0], darkWood);
  for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    box(group, [0.1, 0.08, 0.1], [x, 0.06, z], darkWood);
  }
  cylinder(group, 0.17, 0.025, [0, 0.755, 0], cream);
  return group;
}

function doubleTableModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [1.84, 0.12, 0.84], [0, 0.68, 0], wood);
  for (const x of [-0.48, 0.48]) cylinder(group, 0.1, 0.58, [x, 0.34, 0], darkWood);
  for (const x of [-0.48, 0.48]) cylinder(group, 0.17, 0.025, [x, 0.755, 0], cream);
  return group;
}

function chairModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.54, 0.12, 0.54], [0, 0.4, 0], wood);
  box(group, [0.54, 0.55, 0.09], [0, 0.73, 0.23], wood);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    box(group, [0.08, 0.4, 0.08], [x, 0.2, z], darkWood);
  }
  return group;
}

function stoveModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.9, 0.78, 0.8], [0, 0.4, 0], metal);
  box(group, [0.92, 0.09, 0.82], [0, 0.82, 0], dark);
  for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) {
    cylinder(group, 0.13, 0.035, [x, 0.885, z], 0x161b1d);
  }
  box(group, [0.54, 0.35, 0.025], [0, 0.4, 0.413], dark);
  for (const x of [-0.25, 0, 0.25]) cylinder(group, 0.045, 0.05, [x, 0.69, 0.43], cream).rotation.x = Math.PI / 2;
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

function counterModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.9, 0.72, 0.72], [0, 0.36, 0], wood);
  box(group, [0.98, 0.1, 0.8], [0, 0.77, 0], cream);
  box(group, [0.72, 0.08, 0.03], [0, 0.48, 0.375], darkWood);
  cylinder(group, 0.17, 0.025, [0, 0.835, 0], cream);
  return group;
}

function doorModel(): THREE.Group {
  const group = new THREE.Group();
  box(group, [0.12, 1.65, 0.14], [-0.45, 0.83, 0], darkWood);
  box(group, [0.12, 1.65, 0.14], [0.45, 0.83, 0], darkWood);
  box(group, [1.02, 0.16, 0.16], [0, 1.63, 0], darkWood);
  box(group, [0.75, 1.4, 0.07], [0, 0.76, 0.05], wood);
  sphere(group, 0.05, [0.25, 0.8, 0.11], 0xe7bd52);
  return group;
}

export function createFurnitureMesh(item: Furniture, skin: RestaurantSkin): THREE.Group {
  const group = item.kind === 'table' ? tableModel()
    : item.kind === 'tableDouble' ? doubleTableModel()
    : item.kind === 'chair' ? chairModel()
      : item.kind === 'stove' ? stoveModel()
        : item.kind === 'counter' ? counterModel()
          : item.kind === 'plant' ? plantModel() : doorModel();
  const position = gridToWorld(item.position);
  group.position.set(position.x + (item.kind === 'tableDouble' ? 0.5 : 0), 0.09, position.z);
  group.rotation.y = item.rotation * Math.PI / 180;
  group.userData.entityId = item.id;
  group.userData.skinId = skin.id;
  return group;
}

export function createActorMesh(actor: Employee | Customer): THREE.Group {
  const group = new THREE.Group();
  const chef = 'role' in actor && actor.role === 'chef';
  const waiter = 'role' in actor && actor.role === 'waiter';
  const clothes = chef ? 0xf5f2e9 : waiter ? 0x4275a8 : 0xd56b75;
  const makeJoint = (name: string, x: number, y: number) => {
    const joint = new THREE.Group();
    joint.name = name;
    joint.position.set(x, y, 0);
    group.add(joint);
    return joint;
  };
  const leftLeg = makeJoint('leftLeg', -0.1, 0.4);
  const rightLeg = makeJoint('rightLeg', 0.1, 0.4);
  cylinder(leftLeg, 0.075, 0.35, [0, -0.175, 0], dark);
  cylinder(rightLeg, 0.075, 0.35, [0, -0.175, 0], dark);
  cylinder(group, 0.25, 0.5, [0, 0.58, 0], clothes, 0.2);
  const leftArm = makeJoint('leftArm', -0.26, 0.82);
  const rightArm = makeJoint('rightArm', 0.26, 0.82);
  cylinder(leftArm, 0.065, 0.4, [0, -0.2, 0], 0xf2c39c);
  cylinder(rightArm, 0.065, 0.4, [0, -0.2, 0], 0xf2c39c);
  const head = makeJoint('head', 0, 1.02);
  sphere(head, 0.22, [0, 0, 0], 0xf2c39c);
  sphere(head, 0.21, [0, 0.11, -0.04], 0x5b3c2d, [1, 0.48, 1]);
  if (chef) {
    cylinder(head, 0.23, 0.22, [0, 0.23, 0], 0xffffff);
    sphere(head, 0.24, [0, 0.36, 0], 0xffffff, [1, 0.6, 1]);
  }
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
    new THREE.MeshBasicMaterial({ color: 0x62bd68, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  patienceRing.rotation.x = -Math.PI / 2;
  patienceRing.position.y = 0.015;
  patienceRing.visible = false;
  group.add(patienceRing);
  group.userData.entityId = actor.id;
  group.userData.joints = { leftArm, rightArm, leftLeg, rightLeg, head };
  group.userData.carrying = carrying;
  group.userData.cooking = cooking;
  group.userData.patienceRing = patienceRing;
  group.userData.seatOffset = 0;
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
