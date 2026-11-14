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
  group.userData = { width, height, groundWidth, groundDepth };

  box(group, [groundWidth, 0.16, groundDepth], [offsetX, -0.5, offsetZ], 0x70a84f);

  const landscaping = new THREE.Group();
  landscaping.name = 'landscaping';
  addTree(landscaping, width - 2.7, -1.8, 0.9);
  addTree(landscaping, width - 2.5, height - 5.2, 1.05);
  addTree(landscaping, -1.5, height - 2.6, 0.85);
  for (const [x, z] of [[width - 3.2, 0.8], [1.2, height - 3.1], [width - 4.1, height - 2.7]] as const) {
    sphere(landscaping, 0.48, [x, 0.05, z], 0x398141, [1.15, 0.85, 1]);
  }
  addBench(landscaping, offsetX + 1.2, height - 2.5);
  group.add(landscaping);
  return group;
}
