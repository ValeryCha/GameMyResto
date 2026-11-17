import * as THREE from 'three';

const cache = new Map<number, THREE.MeshStandardMaterial>();
const geometries = new Map<string, THREE.BufferGeometry>();

export function material(color: number): THREE.MeshStandardMaterial {
  let value = cache.get(color);
  if (!value) {
    value = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.02 });
    cache.set(color, value);
  }
  return value;
}

function cachedGeometry(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = geometries.get(key);
  if (!geometry) {
    geometry = create();
    geometries.set(key, geometry);
  }
  return geometry;
}

export function box(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
): THREE.Mesh {
  const geometry = cachedGeometry(`box:${size.join(':')}`, () => new THREE.BoxGeometry(...size));
  const mesh = new THREE.Mesh(geometry, material(color));
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
  const geometry = cachedGeometry(`cylinder:${topRadius}:${radius}:${height}`, () => new THREE.CylinderGeometry(topRadius, radius, height, 10));
  const mesh = new THREE.Mesh(geometry, material(color));
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
  const geometry = cachedGeometry(`sphere:${radius}`, () => new THREE.SphereGeometry(radius, 10, 8));
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
