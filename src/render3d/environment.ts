import * as THREE from 'three';
import { box, cylinder, sphere } from './materials';

function addTree(parent: THREE.Group, x: number, z: number, scale = 1): void {
  const tree = new THREE.Group();
  cylinder(tree, 0.15 * scale, 1.25 * scale, [0, 0.63 * scale, 0], 0x725039);
  sphere(tree, 0.72 * scale, [0, 1.55 * scale, 0], 0x3d7d42, [0.9, 1.05, 0.9]);
  sphere(tree, 0.5 * scale, [0.42 * scale, 1.45 * scale, 0], 0x4d914c);
  sphere(tree, 0.48 * scale, [-0.35 * scale, 1.5 * scale, 0.12 * scale], 0x478947);
  tree.position.set(x, -0.4, z);
  parent.add(tree);
}

function addLamp(parent: THREE.Group, x: number, z: number): void {
  const lamp = new THREE.Group();
  cylinder(lamp, 0.09, 0.18, [0, 0.09, 0], 0x687477);
  cylinder(lamp, 0.045, 2.35, [0, 1.25, 0], 0x7f8d91);
  sphere(lamp, 0.18, [0, 2.48, 0], 0xfff1c8);
  lamp.position.set(x, -0.27, z);
  parent.add(lamp);
}

function addBench(parent: THREE.Group, x: number, z: number): void {
  const bench = new THREE.Group();
  for (const localZ of [-0.2, 0, 0.2]) box(bench, [1.45, 0.09, 0.15], [0, 0.48, localZ], 0x9a673d);
  for (const localY of [0.78, 1.0]) box(bench, [1.45, 0.15, 0.08], [0, localY, 0.28], 0x9a673d);
  for (const localX of [-0.55, 0.55]) {
    box(bench, [0.09, 0.48, 0.09], [localX, 0.24, 0], 0x4b5553);
    box(bench, [0.09, 0.72, 0.09], [localX, 0.58, 0.28], 0x4b5553);
  }
  bench.position.set(x, -0.4, z);
  parent.add(bench);
}

export function createRestaurantEnvironment(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const offsetX = (width - 8) / 2;
  const offsetZ = (height - 8) / 2;
  const groundWidth = width + 16;
  const groundDepth = height + 16;
  const roadLengthX = width + 10;
  const roadLengthZ = height + 10;
  group.userData = { width, height, groundWidth, groundDepth, roadLengthX, roadLengthZ };

  box(group, [groundWidth, 0.16, groundDepth], [offsetX, -0.5, offsetZ], 0x70a84f);

  const roads = new THREE.Group();
  roads.name = 'roads';
  box(roads, [roadLengthX, 0.06, 3], [offsetX + 1, -0.39, -6.4], 0x555b5d);
  box(roads, [3, 0.06, roadLengthZ], [-6.4, -0.39, offsetZ + 1], 0x555b5d);
  for (let x = -3; x < width - 3; x += 2.4) box(roads, [1.15, 0.025, 0.1], [x, -0.35, -6.4], 0xf3ead2);
  for (let z = -3; z < height - 3; z += 2.4) box(roads, [0.1, 0.025, 1.15], [-6.4, -0.35, z], 0xf3ead2);
  for (let index = 0; index < 6; index += 1) {
    box(roads, [0.32, 0.03, 2.35], [offsetX + 0.6 + index * 0.55, -0.34, -6.4], 0xf7f3e8);
  }
  group.add(roads);

  const sidewalks = new THREE.Group();
  sidewalks.name = 'sidewalks';
  for (let x = -4; x < width - 3; x += 1) {
    box(sidewalks, [0.96, 0.16, 0.85], [x, -0.35, -4.58], (x + 4) % 2 ? 0xd4d0c2 : 0xe2ded0);
  }
  for (let z = -4; z < height - 3; z += 1) {
    box(sidewalks, [0.85, 0.16, 0.96], [-4.58, -0.35, z], (z + 4) % 2 ? 0xd4d0c2 : 0xe2ded0);
  }
  box(sidewalks, [roadLengthX, 0.2, 0.16], [offsetX + 1, -0.34, -4.98], 0xb7b5aa);
  box(sidewalks, [0.16, 0.2, roadLengthZ], [-4.98, -0.34, offsetZ + 1], 0xb7b5aa);
  group.add(sidewalks);

  const landscaping = new THREE.Group();
  landscaping.name = 'landscaping';
  addTree(landscaping, width - 2.7, -1.8, 0.9);
  addTree(landscaping, width - 2.5, height - 5.2, 1.05);
  addTree(landscaping, -1.5, height - 2.6, 0.85);
  for (const [x, z] of [[width - 3.2, 0.8], [1.2, height - 3.1], [width - 4.1, height - 2.7]] as const) {
    sphere(landscaping, 0.48, [x, 0.05, z], 0x398141, [1.15, 0.85, 1]);
  }
  addBench(landscaping, offsetX + 1.2, height - 2.5);
  for (let x = -2; x < width - 3; x += 4) addLamp(landscaping, x, -4.55);
  group.add(landscaping);
  return group;
}
