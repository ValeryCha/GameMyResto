import * as THREE from 'three';
import { moveDoor, moveFurniture, placeFurniture, removeFurniture, rotateFurniture } from '../simulation/commands';
import { advanceSimulation } from '../simulation/tick';
import { furnitureCells } from '../simulation/grid';
import type { FurnitureKind, GameState } from '../simulation/types';
import { gridToWorld, worldToGrid } from './coordinates';
import { createActorMesh, createFurnitureMesh, createRestaurantShell } from './models';
import { updateActorVisual } from './actors';
import { classicSkin } from './skins';

export interface WorldCallbacks {
  onChange(): void;
  onPlacementEnd(): void;
  onPlacementError(reason: string): void;
  onSelect(id: string | null, moving: boolean): void;
  onSecond(): void;
  onFrame(): void;
}

export class RestaurantWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private entities = new Map<string, THREE.Group>();
  private motions = new Map<string, { from: THREE.Vector3; to: THREE.Vector3; startedAt: number; grid: string }>();
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private placementKind: FurnitureKind | null = null;
  private doorMoveMode = false;
  private editorMode = false;
  private selectedId: string | null = null;
  private editorMoving = false;
  private highlights: THREE.Mesh[] = [];
  private shell: THREE.Group;
  private frameId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private resizeObserver: ResizeObserver;
  private zoom = 1;
  private cameraControls: HTMLDivElement;
  private pan = new THREE.Vector3();
  private drag: { id: number; x: number; y: number; startX: number; startY: number } | null = null;

  constructor(private container: HTMLElement, private state: GameState, private callbacks: WorldCallbacks) {
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
    const ground = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshStandardMaterial({ color: 0xa8c9ad, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.shell = createRestaurantShell(state.width, state.height, classicSkin);
    this.scene.add(this.shell);
    for (let i = 0; i < 2; i += 1) {
      const highlight = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.025, 0.94), new THREE.MeshBasicMaterial({ color: 0x65d77a, transparent: true, opacity: 0.48 }));
      highlight.visible = false;
      this.highlights.push(highlight);
      this.scene.add(highlight);
    }
    this.camera.position.set(11, 13, 11);
    this.camera.lookAt(0, 0.3, 0);
    this.cameraControls = document.createElement('div');
    this.cameraControls.style.cssText = 'position:absolute;right:16px;bottom:16px;z-index:5;display:grid;grid-template-columns:44px 44px 44px;gap:8px';
    for (const [label, title, action] of [
      ['+', 'Приблизить камеру', () => this.zoomIn()],
      ['−', 'Отдалить камеру', () => this.zoomOut()],
      ['⌂', 'Сбросить вид', () => this.resetView()],
    ] as const) {
      const button = document.createElement('button');
      button.textContent = label;
      button.setAttribute('aria-label', title);
      button.style.cssText = 'width:44px;height:44px;border:2px solid #6b422d;border-radius:12px;background:#fff8e9;color:#3d2d24;font:bold 24px sans-serif;cursor:pointer;touch-action:manipulation';
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      button.addEventListener('click', action);
      this.cameraControls.append(button);
    }
    container.append(this.cameraControls);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointer);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerEnd);
    this.renderer.domElement.addEventListener('pointercancel', this.onPointerEnd);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.renderer.domElement.style.touchAction = 'none';
    window.addEventListener('keydown', this.onKeyDown);
    this.resize();
  }

  private resetView(): void {
    this.pan.set(0, 0, 0);
    this.zoom = 1;
    this.resize();
  }

  private clampPan(): void {
    const centerX = (this.state.width - 8) / 2;
    const centerZ = (this.state.height - 8) / 2;
    this.pan.x = THREE.MathUtils.clamp(this.pan.x, centerX - this.state.width / 2 - 2, centerX + this.state.width / 2 + 2);
    this.pan.z = THREE.MathUtils.clamp(this.pan.z, centerZ - this.state.height / 2 - 2, centerZ + this.state.height / 2 + 2);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || this.container.hidden) return;
    const moves: Record<string, [number, number]> = {
      KeyW: [-1, -1], ArrowUp: [-1, -1], KeyS: [1, 1], ArrowDown: [1, 1],
      KeyA: [-1, 1], ArrowLeft: [-1, 1], KeyD: [1, -1], ArrowRight: [1, -1],
    };
    const move = moves[event.code];
    if (!move) return;
    event.preventDefault();
    const step = 0.6 / this.zoom;
    this.pan.x += move[0] * step;
    this.pan.z += move[1] * step;
    this.clampPan();
    this.resize();
  };

  private onPointerEnd = (event: PointerEvent): void => {
    if (this.drag?.id !== event.pointerId) return;
    const isClick = Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) <= 5;
    const selectOnRelease = this.editorMode && !this.editorMoving && event.type === 'pointerup' && isClick;
    this.drag = null;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
    this.renderer.domElement.style.cursor = 'default';
    if (selectOnRelease) this.selectFurniture(event);
  };

  zoomIn(): void {
    this.zoom = Math.min(1.8, Math.round((this.zoom + 0.1) * 10) / 10);
    this.resize();
  }

  zoomOut(): void {
    this.zoom = Math.max(0.7, Math.round((this.zoom - 0.1) * 10) / 10);
    this.resize();
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.deltaY < 0) this.zoomIn();
    else this.zoomOut();
  };

  setPlacementMode(kind: FurnitureKind | null): void {
    this.placementKind = kind;
    this.doorMoveMode = false;
    this.renderer.domElement.style.cursor = kind ? 'crosshair' : 'default';
    if (!kind) this.hideHighlights();
  }

  setDoorMoveMode(enabled: boolean): void {
    this.doorMoveMode = enabled;
    this.placementKind = null;
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'default';
    if (!enabled) this.hideHighlights();
  }

  cancelPlacement(): void {
    this.placementKind = null;
    this.doorMoveMode = false;
    this.renderer.domElement.style.cursor = 'default';
    this.hideHighlights();
  }

  setEditorMode(enabled: boolean): void {
    this.cancelPlacement();
    this.editorMode = enabled;
    this.selectedId = null;
    this.editorMoving = false;
    this.accumulator = 0;
    this.callbacks.onSelect(null, false);
    this.renderer.domElement.style.cursor = enabled ? 'pointer' : 'default';
  }

  moveSelected(): void {
    if (!this.selectedId) return;
    this.editorMoving = !this.editorMoving;
    this.renderer.domElement.style.cursor = this.editorMoving ? 'crosshair' : 'pointer';
    this.callbacks.onSelect(this.selectedId, this.editorMoving);
  }

  rotateSelected(): void {
    if (!this.selectedId) return;
    const result = rotateFurniture(this.state, this.selectedId);
    if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя повернуть');
    this.callbacks.onChange();
  }

  removeSelected(): void {
    if (!this.selectedId) return;
    const result = removeFurniture(this.state, this.selectedId);
    if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя удалить');
    this.selectedId = null;
    this.editorMoving = false;
    this.hideHighlights();
    this.callbacks.onSelect(null, false);
    this.callbacks.onChange();
  }

  start(): void {
    if (this.frameId) return;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.animate);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.drag = null;
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointer);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerEnd);
    this.renderer.domElement.removeEventListener('pointercancel', this.onPointerEnd);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    this.cameraControls.remove();
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private animate = (time: number): void => {
    this.accumulator += Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    while (!this.editorMode && this.accumulator >= 1000) {
      advanceSimulation(this.state);
      this.callbacks.onSecond();
      this.accumulator -= 1000;
    }
    if (this.editorMode) this.accumulator = 0;
    this.syncShell();
    this.syncEntities(time);
    this.renderer.render(this.scene, this.camera);
    this.callbacks.onFrame();
    this.frameId = requestAnimationFrame(this.animate);
  };

  private syncShell(): void {
    if (this.shell.userData.width === this.state.width && this.shell.userData.height === this.state.height) return;
    this.scene.remove(this.shell);
    this.shell.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    this.shell = createRestaurantShell(this.state.width, this.state.height, classicSkin);
    this.scene.add(this.shell);
  }

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const aspect = width / height;
    const roomHeight = Math.max(12, this.state.height + 4);
    const viewHeight = (aspect < 1 ? roomHeight / aspect : roomHeight) / this.zoom;
    const offsetX = (this.state.width - 8) / 2;
    const offsetZ = (this.state.height - 8) / 2;
    this.clampPan();
    this.camera.position.set(11 + offsetX + this.pan.x, 13, 11 + offsetZ + this.pan.z);
    this.camera.lookAt(offsetX + this.pan.x, 0.3, offsetZ + this.pan.z);
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private gridFromPointer(event: PointerEvent) {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, intersection)) return null;
    const point = worldToGrid(intersection);
    if (point.x < 0 || point.y < 0 || point.x >= this.state.width || point.y >= this.state.height) return null;
    return point;
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (this.drag?.id === event.pointerId) {
      const scale = Math.max(12, this.state.height + 4) / this.zoom / Math.max(this.renderer.domElement.clientHeight, 1);
      const dx = (event.clientX - this.drag.x) * scale;
      const dy = (event.clientY - this.drag.y) * scale;
      this.pan.x -= (dx - dy) / Math.sqrt(2);
      this.pan.z -= (dx + dy) / Math.sqrt(2);
      this.drag = { ...this.drag, x: event.clientX, y: event.clientY };
      this.clampPan();
      this.resize();
      return;
    }
    if (!this.placementKind && !this.doorMoveMode && !this.editorMoving) return;
    const point = this.gridFromPointer(event);
    if (!point) return this.hideHighlights();
    const selected = this.state.furniture.find((item) => item.id === this.selectedId);
    const cells = this.editorMoving && selected
      ? furnitureCells({ ...selected, position: point })
      : this.placementKind === 'tableDouble'
        ? furnitureCells({ id: 'preview', kind: 'tableDouble', position: point, rotation: 0 })
        : [point];
    const valid = cells.every((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < this.state.width && cell.y < this.state.height &&
      !this.state.furniture.some((item) => item.id !== this.selectedId && furnitureCells(item).some((occupied) => occupied.x === cell.x && occupied.y === cell.y))) &&
      (!this.doorMoveMode || point.x === 0 || point.y === 0 || point.x === this.state.width - 1 || point.y === this.state.height - 1);
    this.highlights.forEach((highlight, index) => {
      const cell = cells[index];
      highlight.visible = Boolean(cell);
      if (!cell) return;
      const position = gridToWorld(cell);
      highlight.position.set(position.x, 0.12, position.z);
      (highlight.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x65d77a : 0xe05d55);
    });
  };

  private selectFurniture(event: PointerEvent): void {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const models = this.state.furniture.map((item) => this.entities.get(item.id)).filter(Boolean) as THREE.Group[];
    const hit = this.raycaster.intersectObjects(models, true)[0];
    let object: THREE.Object3D | undefined = hit?.object;
    while (object && !object.userData.entityId) object = (object.parent ?? undefined) as THREE.Object3D | undefined;
    this.selectedId = object?.userData.entityId ?? null;
    this.editorMoving = false;
    this.hideHighlights();
    const item = this.state.furniture.find((candidate) => candidate.id === this.selectedId);
    if (item) furnitureCells(item).forEach((cell, index) => {
      const position = gridToWorld(cell);
      this.highlights[index].position.set(position.x, 0.12, position.z);
      this.highlights[index].visible = true;
      (this.highlights[index].material as THREE.MeshBasicMaterial).color.setHex(0x5ba8e0);
    });
    this.callbacks.onSelect(this.selectedId, false);
  }

  private onPointer = (event: PointerEvent): void => {
    if (this.editorMode && this.editorMoving) {
      const point = this.gridFromPointer(event);
      if (!point || !this.selectedId) return;
      const result = moveFurniture(this.state, this.selectedId, point);
      if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя переместить сюда');
      this.editorMoving = false;
      this.renderer.domElement.style.cursor = 'pointer';
      this.callbacks.onSelect(this.selectedId, false);
      this.callbacks.onChange();
      return;
    }
    if (!this.placementKind && !this.doorMoveMode) {
      if (event.button !== 0) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const point = this.gridFromPointer(event);
    if (!point) return;
    const result = this.doorMoveMode ? moveDoor(this.state, point) : placeFurniture(this.state, this.placementKind!, point);
    if (!result.ok) {
      this.callbacks.onPlacementError(result.reason ?? 'Нельзя разместить здесь');
      return;
    }
    this.cancelPlacement();
    this.callbacks.onPlacementEnd();
    this.callbacks.onChange();
  };

  private hideHighlights(): void {
    for (const highlight of this.highlights) highlight.visible = false;
  }

  private syncEntities(time: number): void {
    const current = new Set<string>();
    for (const item of this.state.furniture) {
      current.add(item.id);
      let model = this.entities.get(item.id);
      const expected = `${item.position.x},${item.position.y},${item.rotation}`;
      if (model && model.userData.grid !== expected) {
        this.scene.remove(model);
        this.entities.delete(item.id);
        model = undefined;
      }
      if (!model) {
        model = createFurnitureMesh(item, classicSkin);
        model.userData.grid = expected;
        this.entities.set(item.id, model);
        this.scene.add(model);
      }
    }
    for (const actor of [...this.state.employees, ...this.state.customers]) {
      current.add(actor.id);
      let model = this.entities.get(actor.id);
      const position = gridToWorld(actor.position);
      const target = new THREE.Vector3(position.x, 0.08, position.z);
      const grid = `${actor.position.x},${actor.position.y}`;
      if (!model) {
        model = createActorMesh(actor);
        model.position.copy(target);
        this.entities.set(actor.id, model);
        this.motions.set(actor.id, { from: target.clone(), to: target.clone(), startedAt: time, grid });
        this.scene.add(model);
      }
      let motion = this.motions.get(actor.id)!;
      if (motion.grid !== grid) {
        motion = { from: model.position.clone(), to: target, startedAt: time, grid };
        this.motions.set(actor.id, motion);
      }
      const rawProgress = THREE.MathUtils.clamp((time - motion.startedAt) / 450, 0, 1);
      const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      model.position.lerpVectors(motion.from, motion.to, progress);
      const moving = rawProgress < 1 && motion.from.distanceToSquared(motion.to) > 0.001;
      if (moving) {
        const direction = motion.to.clone().sub(motion.from);
        model.rotation.y = Math.atan2(direction.x, direction.z);
      }
      const customer = 'state' in actor ? actor : undefined;
      const seated = Boolean(customer && ['seated', 'ordering', 'waitingFood', 'eating'].includes(customer.state));
      if (seated && customer?.seatId) {
        const table = this.state.furniture.find((item) =>
          (item.kind === 'table' || item.kind === 'tableDouble') &&
          Math.abs(item.position.x - actor.position.x) + Math.abs(item.position.y - actor.position.y) === 1);
        if (table) model.rotation.y = Math.atan2(table.position.x - actor.position.x, table.position.y - actor.position.y);
      }
      const order = 'role' in actor && actor.taskId ? this.state.orders.find((item) => item.id === actor.taskId) : undefined;
      const patience = customer && !['eating', 'leaving', 'ordering', 'seated'].includes(customer.state)
        ? (customer.state === 'waitingFood' ? (customer.foodWait ?? 120) / 120 : customer.patience / 300) : undefined;
      updateActorVisual(model, { moving, seated, time: time / 1000, delta: 1 / 60, patience,
        carrying: order?.state === 'waitingDelivery' && order.pickedUp, cooking: order?.state === 'cooking' });
      model.position.y += (model.userData.bodyBob ?? 0) + (model.userData.seatOffset ?? 0);
    }
    for (const [id, model] of this.entities) {
      if (!current.has(id)) {
        this.scene.remove(model);
        this.entities.delete(id);
        this.motions.delete(id);
      }
    }
  }
}
