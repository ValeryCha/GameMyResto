import * as THREE from 'three';
import { placeFurniture } from '../simulation/commands';
import { advanceSimulation } from '../simulation/tick';
import type { GameState } from '../simulation/types';
import { gridToWorld, worldToGrid } from './coordinates';
import { createActorMesh, createFurnitureMesh, createRestaurantShell } from './models';
import { classicSkin } from './skins';

export interface WorldCallbacks {
  onChange(): void;
  onPlacementEnd(): void;
  onSecond(): void;
  onFrame(): void;
}

export class RestaurantWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private entities = new Map<string, THREE.Group>();
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private plantMode = false;
  private frameId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private resizeObserver: ResizeObserver;

  constructor(
    private container: HTMLElement,
    private state: GameState,
    private callbacks: WorldCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', 'Трёхмерный зал ресторана');
    container.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xb9d9c2);
    this.scene.fog = new THREE.Fog(0xb9d9c2, 24, 42);

    this.scene.add(new THREE.HemisphereLight(0xfff4df, 0x63735b, 2.2));
    const sun = new THREE.DirectionalLight(0xffead0, 3.4);
    sun.position.set(5, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({ color: 0xa8c9ad, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(createRestaurantShell(state.width, state.height, classicSkin));

    this.camera.position.set(11, 13, 11);
    this.camera.lookAt(0, 0.3, 0);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointer);
    this.resize();
  }

  setPlantMode(enabled: boolean): void {
    this.plantMode = enabled;
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'default';
  }

  start(): void {
    if (this.frameId) return;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointer);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private animate = (time: number): void => {
    this.accumulator += Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    while (this.accumulator >= 1000) {
      advanceSimulation(this.state);
      this.callbacks.onSecond();
      this.accumulator -= 1000;
    }
    this.syncEntities();
    this.renderer.render(this.scene, this.camera);
    this.callbacks.onFrame();
    this.frameId = requestAnimationFrame(this.animate);
  };

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const aspect = width / height;
    const viewHeight = aspect < 1 ? 12 / aspect : 12;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onPointer = (event: PointerEvent): void => {
    if (!this.plantMode) return;
    this.plantMode = false;
    this.callbacks.onPlacementEnd();
    this.renderer.domElement.style.cursor = 'default';
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, intersection)) return;
    const point = worldToGrid(intersection);
    if (point.x < 0 || point.y < 0 || point.x >= this.state.width || point.y >= this.state.height) return;
    const result = placeFurniture(this.state, 'plant', point);
    if (result.ok) this.callbacks.onChange();
  };

  private syncEntities(): void {
    const current = new Set<string>();
    for (const item of this.state.furniture) {
      current.add(item.id);
      if (!this.entities.has(item.id)) {
        const model = createFurnitureMesh(item, classicSkin);
        this.entities.set(item.id, model);
        this.scene.add(model);
      }
    }
    for (const actor of [...this.state.employees, ...this.state.customers]) {
      current.add(actor.id);
      let model = this.entities.get(actor.id);
      if (!model) {
        model = createActorMesh(actor);
        this.entities.set(actor.id, model);
        this.scene.add(model);
      }
      const position = gridToWorld(actor.position);
      model.position.set(position.x, 0.08, position.z);
    }
    for (const [id, model] of this.entities) {
      if (!current.has(id)) {
        this.scene.remove(model);
        this.entities.delete(id);
      }
    }
  }
}
