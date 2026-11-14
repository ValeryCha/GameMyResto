import * as THREE from 'three';

const cache = new Map<number, THREE.MeshStandardMaterial>();

export function material(color: number): THREE.MeshStandardMaterial {
  let value = cache.get(color);
  if (!value) {
    value = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.02 });
    cache.set(color, value);
  }
  return value;
}

export function box(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function cylinder(
  group: THREE.Group,
  radius: number,
  height: number,
  position: [number, number, number],
  color: number,
  topRadius = radius,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, radius, height, 16), material(color));
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function sphere(
  group: THREE.Group,
  radius: number,
  position: [number, number, number],
  color: number,
  scale: [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
