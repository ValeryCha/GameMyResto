import * as THREE from 'three';
import { DISHES } from '../content/dishes';
import { moveDoor, moveFurniture, removeFurniture, rotateFurniture } from '../simulation/commands';
import { placePurchasedFurniture, purchaseFurnitureBatch } from '../simulation/inventory';
import { advanceSimulation } from '../simulation/tick';
import { furnitureCells } from '../simulation/grid';
import type { FurnitureKind, GameState } from '../simulation/types';
import { gridToWorld, worldToGrid } from './coordinates';
import { createActorMesh, createCrowdActorMesh, createFurnitureMesh, createRestaurantShell, updateDoorVisual } from './models';
import { updateActorVisual } from './actors';
import { classicSkin } from './skins';
import { clampZoom, fitZoom } from './cameraMath';
import { setButtonIcon } from '../ui/icons';
import { createRestaurantEnvironment } from './environment';
import { applyWallpaper, removeWallpaper } from '../simulation/decorations';
import { applyFurnitureSkin, assignedSkinId, movePainting, placePainting } from '../simulation/catalogDecorations';
import { createPaintingLayer } from './paintings';
import { createWallpaperLayer } from './wallpapers';
import { createFloorLayer } from './floors';
import { createWindowLayer } from './windows';
import { moveWindow, placeWindow } from '../simulation/wallWindows';
import { setEditorMode as setStateEditorMode } from '../simulation/editorMode';

export interface WorldCallbacks {
  onChange(): void;
  onPlacementEnd(): void;
  onPlacementError(reason: string): void;
  onPlacementProgress(kind: FurnitureKind): void;
  onWallpaperApplied(remaining: number): void;
  onSkinApplied(skinId: string, targetId: string): void;
  onSelect(id: string | null, moving: boolean): void;
  onWallDecorationSelect(kind: 'painting' | 'window', id: string): void;
  onSecond(): void;
  onFrame(): void;
}

export class RestaurantWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private entities = new Map<string, THREE.Group>();
  private deliveryLabels = new Map<string, HTMLDivElement>();
  private motions = new Map<string, { from: THREE.Vector3; to: THREE.Vector3; startedAt: number; grid: string }>();
  private raycaster = new THREE.Raycaster();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private placementKind: FurnitureKind | null = null;
  private doorMoveMode = false;
  private editorMode = false;
  private editorStartedAt: number | null = null;
  private selectedId: string | null = null;
  private editorMoving = false;
  private highlights: THREE.Mesh[] = [];
  private shell: THREE.Group;
  private environment: THREE.Group;
  private wallpaperLayer: THREE.Group;
  private paintingLayer: THREE.Group;
  private paintingKey = '';
  private paintingMode: string | null = null;
  private paintingMoveMode: string | null = null;
  private windowLayer: THREE.Group;
  private windowKey = '';
  private windowMode: string | null = null;
  private windowMoveMode: string | null = null;
  private skinMode: string | null = null;
  private floorLayer: THREE.Mesh | null;
  private floorKey: string;
  private wallpaperKey: string;
  private wallpaperMode: string | null = null;
  private wallpaperRemoveMode = false;
  private wallpaperHighlight: THREE.Mesh;
  private frameId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private resizeObserver: ResizeObserver;
  private zoom = 1;
  private cameraControls: HTMLDivElement;
  private zoomRange?: HTMLInputElement;
  private pan = new THREE.Vector3();
  private drag: { id: number; startX: number; startY: number; floorPoint: THREE.Vector3 | null } | null = null;

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
    this.environment = createRestaurantEnvironment(state.width, state.height);
    this.scene.add(this.environment);
    this.shell = createRestaurantShell(state.width, state.height, classicSkin);
    this.scene.add(this.shell);
    this.floorLayer = createFloorLayer(state);
    this.floorKey = this.currentFloorKey();
    if (this.floorLayer) this.scene.add(this.floorLayer);
    this.wallpaperLayer = createWallpaperLayer(state);
    this.wallpaperKey = this.currentWallpaperKey();
    this.scene.add(this.wallpaperLayer);
    this.paintingLayer = createPaintingLayer(state);
    this.paintingKey = this.currentPaintingKey();
    this.scene.add(this.paintingLayer);
    this.windowLayer = createWindowLayer(this.state);
    this.windowKey = this.currentWindowKey();
    this.scene.add(this.windowLayer);
    this.wallpaperHighlight = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1),
      new THREE.MeshBasicMaterial({ color: 0x65d77a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    this.wallpaperHighlight.visible = false;
    this.scene.add(this.wallpaperHighlight);
    for (let i = 0; i < 2; i += 1) {
      const highlight = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.025, 0.94), new THREE.MeshBasicMaterial({ color: 0x65d77a, transparent: true, opacity: 0.48 }));
      highlight.visible = false;
      this.highlights.push(highlight);
      this.scene.add(highlight);
    }
    this.camera.position.set(11, 13, 11);
    this.camera.lookAt(0, 0.3, 0);
    this.cameraControls = document.createElement('div');
    this.cameraControls.className = 'camera-controls';
    this.cameraControls.style.cssText = 'position:absolute;right:16px;bottom:16px;z-index:5;display:flex;flex-direction:column;align-items:center;gap:8px';
    const homeButton = document.createElement('button');
    homeButton.className = 'camera-home';
    setButtonIcon(homeButton, 'Сбросить вид', 'home');
    homeButton.addEventListener('pointerdown', (event) => event.stopPropagation());
    homeButton.addEventListener('click', () => this.resetView());
    this.zoomRange = document.createElement('input');
    this.zoomRange.type = 'range';
    this.zoomRange.className = 'camera-zoom';
    this.zoomRange.dataset.testid = 'camera-zoom';
    this.zoomRange.setAttribute('aria-label', 'Масштаб камеры');
    this.zoomRange.title = 'Масштаб камеры';
    this.zoomRange.max = '1.8';
    this.zoomRange.step = '0.1';
    this.zoomRange.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.zoomRange.addEventListener('input', () => {
      const aspect = Math.max(this.container.clientWidth, 1) / Math.max(this.container.clientHeight, 1);
      const minimum = fitZoom(this.state.width, this.state.height, aspect);
      this.zoom = clampZoom(Number(this.zoomRange!.value), minimum);
      this.resize();
    });
    this.cameraControls.append(this.zoomRange, homeButton);
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
    const aspect = Math.max(this.container.clientWidth, 1) / Math.max(this.container.clientHeight, 1);
    this.zoom = fitZoom(this.state.width, this.state.height, aspect);
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
    if (event.code === 'Escape') {
      this.cancelPlacement();
      this.callbacks.onPlacementEnd();
      return;
    }
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
    const applyWallpaperClick = Boolean(this.wallpaperMode || this.wallpaperRemoveMode) && event.type === 'pointerup' && isClick;
    this.drag = null;
    if (applyWallpaperClick) this.applyWallpaperAtPointer(event);
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
    this.renderer.domElement.style.cursor = 'default';
    if (selectOnRelease) this.selectFurniture(event);
  };

  zoomIn(): void {
    this.zoom = Math.min(1.8, Math.round((this.zoom + 0.1) * 10) / 10);
    this.resize();
  }

  zoomOut(): void {
    const aspect = Math.max(this.container.clientWidth, 1) / Math.max(this.container.clientHeight, 1);
    const minimum = fitZoom(this.state.width, this.state.height, aspect);
    this.zoom = Math.max(minimum, Math.round((this.zoom - 0.1) * 10) / 10);
    this.resize();
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.deltaY < 0) this.zoomIn();
    else this.zoomOut();
  };

  setPlacementMode(kind: FurnitureKind | null): void {
    this.cancelPlacement(); this.placementKind = kind;
    this.renderer.domElement.style.cursor = kind ? 'crosshair' : 'default';
  }

  setDoorMoveMode(enabled: boolean): void {
    this.cancelPlacement(); this.doorMoveMode = enabled;
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'default';
  }

  setWallpaperMode(wallpaperId: string | null): void {
    this.cancelPlacement(); this.wallpaperMode = wallpaperId;
    this.renderer.domElement.style.cursor = wallpaperId ? 'crosshair' : 'default';
  }

  setWallpaperRemoveMode(enabled: boolean): void {
    this.cancelPlacement(); this.wallpaperRemoveMode = enabled;
    this.renderer.domElement.style.cursor = enabled ? 'crosshair' : 'default';
  }

  setPaintingMode(paintingId: string | null): void {
    this.cancelPlacement(); this.paintingMode = paintingId;
    this.renderer.domElement.style.cursor = paintingId ? 'crosshair' : 'default';
  }

  setPaintingMoveMode(paintingId: string | null): void {
    this.cancelPlacement(); this.paintingMoveMode = paintingId;
    this.renderer.domElement.style.cursor = paintingId ? 'crosshair' : 'pointer';
  }

  setWindowMode(windowId: string | null): void {
    this.cancelPlacement(); this.windowMode = windowId;
    this.renderer.domElement.style.cursor = windowId ? 'crosshair' : 'default';
  }

  setWindowMoveMode(windowId: string | null): void {
    this.cancelPlacement(); this.windowMoveMode = windowId;
    this.renderer.domElement.style.cursor = windowId ? 'crosshair' : 'pointer';
  }

  setSkinMode(skinId: string | null): void {
    this.cancelPlacement(); this.skinMode = skinId;
    this.renderer.domElement.style.cursor = skinId ? 'crosshair' : 'default';
  }

  cancelPlacement(): void {
    this.placementKind = null; this.doorMoveMode = false; this.wallpaperMode = null;
    this.paintingMode = null; this.paintingMoveMode = null; this.skinMode = null;
    this.windowMode = null; this.windowMoveMode = null; this.wallpaperRemoveMode = false;
    this.wallpaperHighlight.visible = false;
    this.renderer.domElement.style.cursor = this.editorMode ? 'pointer' : 'default';
    this.hideHighlights();
  }

  setEditorMode(enabled: boolean): number {
    if (this.editorMode === enabled && Boolean(this.state.editorMode) === enabled) return 0;
    this.cancelPlacement();
    const now = performance.now();
    const relocated = setStateEditorMode(this.state, enabled);
    if (enabled) {
      this.editorStartedAt = now;
      for (const guest of this.state.customers) {
        const model = this.entities.get(guest.id);
        if (model) model.visible = false;
      }
    } else {
      const pausedFor = this.editorStartedAt === null ? 0 : now - this.editorStartedAt;
      for (const guest of this.state.customers) {
        const model = this.entities.get(guest.id);
        if (model) model.visible = true;
        const motion = this.motions.get(guest.id);
        // Визуальная интерполяция продолжается с того же момента, а не догоняет время паузы.
        if (motion) motion.startedAt += pausedFor;
      }
      this.editorStartedAt = null;
    }
    this.editorMode = enabled;
    this.selectedId = null;
    this.editorMoving = false;
    this.accumulator = 0;
    this.callbacks.onSelect(null, false);
    this.callbacks.onWallDecorationSelect('painting', '');
    this.renderer.domElement.style.cursor = enabled ? 'pointer' : 'default';
    return relocated.length;
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
    this.callbacks.onWallDecorationSelect('painting', '');
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
    this.deliveryLabels.forEach((label) => label.remove());
    this.deliveryLabels.clear();
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
    this.syncWallpapers();
    this.syncPaintings();
    this.syncWindows();
    this.syncFloor();
    this.syncEntities(time);
    this.renderer.render(this.scene, this.camera);
    this.callbacks.onFrame();
    this.frameId = requestAnimationFrame(this.animate);
  };

  private currentFloorKey(): string {
    return `${this.state.width}x${this.state.height}:${this.state.activeFloorPattern ?? ''}`;
  }

  private syncFloor(): void {
    const key = this.currentFloorKey();
    if (key === this.floorKey) return;
    if (this.floorLayer) {
      this.scene.remove(this.floorLayer);
      this.floorLayer.geometry.dispose();
      const material = this.floorLayer.material as THREE.MeshStandardMaterial;
      material.map?.dispose();
      material.dispose();
    }
    this.floorLayer = createFloorLayer(this.state);
    this.floorKey = key;
    if (this.floorLayer) this.scene.add(this.floorLayer);
  }

  private currentWallpaperKey(): string {
    return `${this.state.width}x${this.state.height}:${this.state.appliedWallpapers.map((item) => `${item.wallCellId}:${item.wallpaperId}`).join('|')}`;
  }

  private syncWallpapers(): void {
    const key = this.currentWallpaperKey();
    if (key === this.wallpaperKey) return;
    this.wallpaperHighlight.visible = false;
    this.scene.remove(this.wallpaperLayer);
    this.wallpaperLayer.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
    this.wallpaperLayer = createWallpaperLayer(this.state);
    this.wallpaperKey = key;
    this.scene.add(this.wallpaperLayer);
  }

  private currentPaintingKey(): string {
    return `${this.state.width}x${this.state.height}:${this.state.appliedPaintings.map((item) => `${item.id}:${item.side}:${item.index}`).join('|')}`;
  }

  private syncPaintings(): void {
    const key = this.currentPaintingKey();
    if (key === this.paintingKey) return;
    this.scene.remove(this.paintingLayer);
    this.paintingLayer.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material as THREE.MeshBasicMaterial;
        material.map?.dispose(); material.dispose();
      }
    });
    this.paintingLayer = createPaintingLayer(this.state);
    this.paintingKey = key;
    this.scene.add(this.paintingLayer);
    this.windowLayer = createWindowLayer(this.state);
    this.windowKey = this.currentWindowKey();
    this.scene.add(this.windowLayer);
  }

  private currentWindowKey(): string {
    return `${this.state.width}x${this.state.height}:${(this.state.appliedWindows ?? []).map((item) => `${item.id}:${item.side}:${item.index}`).join('|')}`;
  }

  private syncWindows(): void {
    const key = this.currentWindowKey();
    if (key === this.windowKey) return;
    this.scene.remove(this.windowLayer);
    this.windowLayer.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
    this.windowLayer = createWindowLayer(this.state); this.windowKey = key; this.scene.add(this.windowLayer);
  }

  private syncShell(): void {
    if (this.shell.userData.width === this.state.width && this.shell.userData.height === this.state.height) return;
    this.scene.remove(this.shell);
    this.shell.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    this.shell = createRestaurantShell(this.state.width, this.state.height, classicSkin);
    this.scene.add(this.shell);
    this.scene.remove(this.environment);
    this.environment.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.environment = createRestaurantEnvironment(this.state.width, this.state.height);
    this.scene.add(this.environment);
    this.resetView();
  }

  private resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const aspect = width / height;
    const roomHeight = Math.max(12, Math.max(this.state.width, this.state.height) + 5);
    const viewHeight = (roomHeight / Math.min(1, aspect)) / this.zoom;
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
    if (this.zoomRange) {
      const minimum = fitZoom(this.state.width, this.state.height, aspect);
      this.zoomRange.min = String(minimum);
      this.zoomRange.value = String(this.zoom);
      this.zoomRange.setAttribute('aria-valuetext', `${this.zoom.toFixed(1)}×`);
    }
  }

  private floorFromPointer(event: PointerEvent): THREE.Vector3 | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    return this.raycaster.ray.intersectPlane(this.floorPlane, new THREE.Vector3());
  }

  private raycasterFromPointer(event: PointerEvent): THREE.Raycaster {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera); return this.raycaster;
  }

  private wallpaperTargetFromPointer(event: PointerEvent): THREE.Mesh | undefined {
    return this.raycasterFromPointer(event).intersectObjects(this.wallpaperLayer.children, false)[0]?.object as THREE.Mesh | undefined;
  }

  private gridFromPointer(event: PointerEvent) {
    const intersection = this.floorFromPointer(event);
    if (!intersection) return null;
    const point = worldToGrid(intersection);
    if (point.x < 0 || point.y < 0 || point.x >= this.state.width || point.y >= this.state.height) return null;
    return point;
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (this.drag?.id === event.pointerId) {
      const current = this.floorFromPointer(event);
      if (current && this.drag.floorPoint) {
        this.pan.x += this.drag.floorPoint.x - current.x;
        this.pan.z += this.drag.floorPoint.z - current.z;
      }
      this.clampPan();
      this.resize();
      this.drag.floorPoint = this.floorFromPointer(event);
      return;
    }
    if (this.wallpaperMode || this.wallpaperRemoveMode || this.paintingMode || this.paintingMoveMode || this.windowMode || this.windowMoveMode) {
      const target = this.wallpaperTargetFromPointer(event);
      this.wallpaperHighlight.visible = Boolean(target);
      if (target) {
        this.wallpaperHighlight.geometry = target.geometry;
        this.wallpaperHighlight.position.copy(target.position);
        this.wallpaperHighlight.rotation.copy(target.rotation);
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(target.quaternion);
        this.wallpaperHighlight.position.addScaledVector(normal, 0.015);
      }
      return;
    }
    if (!this.placementKind && !this.doorMoveMode && !this.editorMoving) return;
    const point = this.gridFromPointer(event);
    if (!point) return this.hideHighlights();
    const selected = this.state.furniture.find((item) => item.id === this.selectedId);
    const cells = this.editorMoving && selected
      ? furnitureCells({ ...selected, position: point }, this.state)
      : this.placementKind === 'tableDouble'
        ? furnitureCells({ id: 'preview', kind: this.placementKind, position: point, rotation: 0 })
        : [point];
    const valid = cells.every((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < this.state.width && cell.y < this.state.height &&
      !this.state.furniture.some((item) => item.id !== this.selectedId && furnitureCells(item, this.state).some((occupied) => occupied.x === cell.x && occupied.y === cell.y))) &&
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
    const decorationHit = this.raycasterFromPointer(event).intersectObjects([this.paintingLayer, this.windowLayer], true)[0];
    let decoration: THREE.Object3D | undefined = decorationHit?.object;
    while (decoration && !decoration.userData.wallDecorationId) decoration = decoration.parent ?? undefined;
    if (decoration) {
      this.selectedId = null; this.editorMoving = false; this.hideHighlights();
      this.callbacks.onSelect(null, false);
      this.callbacks.onWallDecorationSelect(decoration.userData.wallDecorationKind, decoration.userData.wallDecorationId);
      return;
    }
    this.callbacks.onWallDecorationSelect('painting', '');
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
    if (item) furnitureCells(item, this.state).forEach((cell, index) => {
      const position = gridToWorld(cell);
      this.highlights[index].position.set(position.x, 0.12, position.z);
      this.highlights[index].visible = true;
      (this.highlights[index].material as THREE.MeshBasicMaterial).color.setHex(0x5ba8e0);
    });
    this.callbacks.onSelect(this.selectedId, false);
  }

  private applyWallpaperAtPointer(event: PointerEvent): void {
    const target = this.wallpaperTargetFromPointer(event);
    if (!target || (!this.wallpaperMode && !this.wallpaperRemoveMode)) return;
    if (this.wallpaperRemoveMode) {
      const result = removeWallpaper(this.state, target.userData.wallCellId);
      if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Здесь нет обоев');
      this.callbacks.onChange(); return;
    }
    const wallpaperId = this.wallpaperMode!;
    const result = applyWallpaper(this.state, target.userData.wallCellId, wallpaperId);
    if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя наклеить здесь');
    const remaining = this.state.ownedWallpapers[wallpaperId] ?? 0;
    this.callbacks.onChange(); this.callbacks.onWallpaperApplied(remaining);
    if (remaining < 1) { this.cancelPlacement(); this.callbacks.onPlacementEnd(); }
  }

  private onPointer = (event: PointerEvent): void => {
    if (this.skinMode) {
      if (event.button !== 0) return;
      const hit = this.raycasterFromPointer(event).intersectObjects([...this.entities.values()], true)[0];
      let object: THREE.Object3D | undefined = hit?.object;
      while (object && !object.userData.entityId) object = (object.parent ?? undefined) as THREE.Object3D | undefined;
      const targetId = object?.userData.entityId as string | undefined;
      if (!targetId) return this.callbacks.onPlacementError('Выберите подходящий предмет или сотрудника');
      const result = applyFurnitureSkin(this.state, this.skinMode, targetId);
      if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Скин не подходит объекту');
      const skinId = this.skinMode; this.cancelPlacement(); this.callbacks.onPlacementEnd();
      this.callbacks.onChange(); this.callbacks.onSkinApplied(skinId, targetId); return;
    }
    if (this.windowMode || this.windowMoveMode) {
      if (event.button !== 0) return;
      const target = this.wallpaperTargetFromPointer(event); if (!target) return;
      const [side, rawIndex] = (target.userData.wallCellId as string).split('-');
      const result = this.windowMoveMode
        ? moveWindow(this.state, this.windowMoveMode, side as 'north' | 'south' | 'west' | 'east', Number(rawIndex))
        : placeWindow(this.state, this.windowMode!, side as 'north' | 'south' | 'west' | 'east', Number(rawIndex));
      if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя установить окно здесь');
      this.cancelPlacement(); this.callbacks.onPlacementEnd(); this.callbacks.onChange(); return;
    }
    if (this.paintingMode || this.paintingMoveMode) {
      if (event.button !== 0) return;
      const target = this.wallpaperTargetFromPointer(event); if (!target) return;
      const [side, rawIndex] = (target.userData.wallCellId as string).split('-');
      const result = this.paintingMoveMode
        ? movePainting(this.state, this.paintingMoveMode, side as 'north' | 'south' | 'west' | 'east', Number(rawIndex))
        : placePainting(this.state, this.paintingMode!, side as 'north' | 'south' | 'west' | 'east', Number(rawIndex));
      if (!result.ok) return this.callbacks.onPlacementError(result.reason ?? 'Нельзя повесить картину здесь');
      this.cancelPlacement(); this.callbacks.onPlacementEnd(); this.callbacks.onChange(); return;
    }
    if (this.wallpaperMode || this.wallpaperRemoveMode) {
      if (event.button !== 0) return;
      this.drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, floorPoint: this.floorFromPointer(event) };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      return;
    }
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
      this.drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, floorPoint: this.floorFromPointer(event) };
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const point = this.gridFromPointer(event);
    if (!point) return;
    const result = this.doorMoveMode ? moveDoor(this.state, point) : placePurchasedFurniture(this.state, this.placementKind!, point);
    if (!result.ok) {
      this.callbacks.onPlacementError(result.reason ?? 'Нельзя разместить здесь');
      return;
    }
    if (!this.doorMoveMode && this.placementKind && (this.state.furnitureInventory[this.placementKind] ?? 0) < 1) {
      const refill = purchaseFurnitureBatch(this.state, this.placementKind, 1);
      if (refill.ok) this.callbacks.onPlacementProgress(this.placementKind);
      else {
        this.cancelPlacement();
        this.callbacks.onPlacementEnd();
      }
    } else if (this.doorMoveMode || !this.placementKind) {
      this.cancelPlacement();
      this.callbacks.onPlacementEnd();
    }
    this.callbacks.onChange();
  };

  private syncDeliveryLabel(actorId: string, model: THREE.Group, order: GameState['orders'][number] | undefined): void {
    const show = order?.state === 'waitingDelivery' && order.pickedUp && order.desired;
    let label = this.deliveryLabels.get(actorId);
    if (!show) { if (label) label.hidden = true; return; }
    if (!label) {
      label = document.createElement('div'); label.className = 'delivery-label'; label.setAttribute('role', 'status');
      this.container.append(label); this.deliveryLabels.set(actorId, label);
    }
    const dish = DISHES.find((item) => item.id === order.dishId);
    label.textContent = `Несу: ${dish?.name ?? 'желаемое блюдо'}`; label.hidden = false;
    const point = model.position.clone(); point.y += 2.05; point.project(this.camera);
    const x = THREE.MathUtils.clamp((point.x + 1) * this.container.clientWidth / 2, 80, this.container.clientWidth - 80);
    const y = THREE.MathUtils.clamp((1 - point.y) * this.container.clientHeight / 2, 24, this.container.clientHeight - 24);
    label.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  private hideHighlights(): void {
    for (const highlight of this.highlights) highlight.visible = false;
  }

  private syncEntities(time: number): void {
    const current = new Set<string>();
    for (const item of this.state.furniture) {
      current.add(item.id);
      let model = this.entities.get(item.id);
      const furnitureSkin = assignedSkinId(this.state, item.id);
      const expected = `${item.position.x},${item.position.y},${item.rotation}:${item.kind === 'door' ? this.state.activeDoorPattern ?? '' : furnitureSkin ?? ''}`;
      if (model && model.userData.grid !== expected) {
        this.scene.remove(model);
        this.entities.delete(item.id);
        model = undefined;
      }
      if (!model) {
        model = createFurnitureMesh(item, classicSkin, this.state.activeDoorPattern, furnitureSkin);
        model.userData.grid = expected;
        this.entities.set(item.id, model);
        this.scene.add(model);
      }
      if (item.kind === 'door') {
        const open = !this.editorMode && this.state.customers.some((guest) => ['entering', 'leaving'].includes(guest.state) &&
          Math.abs(guest.position.x - item.position.x) + Math.abs(guest.position.y - item.position.y) <= 2);
        updateDoorVisual(model, open, 1 / 60);
      }
      if (item.kind === 'stove') {
        const cooking = this.state.orders.some((order) => order.state === 'cooking' && order.stoveId === item.id);
        model.userData.pan.visible = cooking;
        model.userData.flame.visible = cooking;
        if (cooking) model.userData.flame.scale.y = 0.9 + Math.sin(time / 90) * 0.1;
      }
      if (item.kind === 'counter') {
        const readyDish = model.userData.readyDish as THREE.Group | undefined;
        if (readyDish) {
          readyDish.visible = this.state.orders.some((order) => order.state === 'waitingDelivery' &&
            !order.pickedUp && order.counterId === item.id);
          readyDish.rotation.y = time / 1800;
        }
      }
    }
    for (const actor of [...this.state.employees, ...this.state.customers]) {
      current.add(actor.id);
      let model = this.entities.get(actor.id);
      if (this.editorMode && !('role' in actor)) {
        // Объект гостя остаётся в сцене со всей анимацией, но полностью скрыт.
        if (model) model.visible = false;
        const label = this.deliveryLabels.get(actor.id);
        if (label) label.hidden = true;
        continue;
      }
      if (model) model.visible = true;
      const position = gridToWorld(actor.position);
      const target = new THREE.Vector3(position.x, 0.08, position.z);
      const grid = `${actor.position.x},${actor.position.y}`;
      const crowd = this.state.customers.length > 30 && !('role' in actor);
      const actorSkin = 'role' in actor ? assignedSkinId(this.state, actor.id) : undefined;
      if (model && (Boolean(model.userData.crowd) !== crowd || model.userData.appliedSkinId !== (actorSkin ?? ''))) {
        this.scene.remove(model); this.entities.delete(actor.id); model = undefined;
      }
      if (!model) {
        model = crowd ? createCrowdActorMesh(actor, actorSkin) : createActorMesh(actor, actorSkin);
        model.userData.appliedSkinId = actorSkin ?? '';
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
        ? (customer.state === 'waitingFood' ? (customer.foodWait ?? 120) / 120 : customer.patience / 240) : undefined;
      updateActorVisual(model, { moving, seated, time: time / 1000, delta: 1 / 60, patience,
        desired: Boolean(customer?.hasDesire && !['eating', 'leaving'].includes(customer.state)),
        desiredDishId: customer?.desiredDishId,
        carrying: order?.state === 'waitingDelivery' && order.pickedUp, cooking: order?.state === 'cooking' });
      model.position.y += (model.userData.bodyBob ?? 0) + (model.userData.seatOffset ?? 0);
      this.syncDeliveryLabel(actor.id, model, order);
    }
    for (const [id, model] of this.entities) {
      if (!current.has(id)) {
        this.scene.remove(model);
        this.entities.delete(id);
        this.motions.delete(id);
        const label = this.deliveryLabels.get(id);
        if (label) { label.remove(); this.deliveryLabels.delete(id); }
      }
    }
  }
}
