import './ui/styles.css';
import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantWorld } from './render3d/RestaurantWorld';
import { createGame } from './simulation/createGame';
import { CATALOG } from './content/coreContent';
import { expandRestaurant, hireWaiter, increaseGuestLimit } from './simulation/shop';
import type { FurnitureKind } from './simulation/types';
import { createHud } from './ui/hud';
import { createDebugPanel } from './ui/debugPanel';
import { createQuestPanel } from './ui/questPanel';
import { createEditorPanel } from './ui/editorPanel';
import { createMainMenu } from './ui/mainMenu';
import { createShopPanel } from './ui/shopPanel';

const storage = new LocalStorageAdapter(window.localStorage);
const container = document.querySelector<HTMLElement>('#game')!;
container.hidden = true;
let state = storage.load();
let world: RestaurantWorld | undefined;
let editing = false;

const hud = createHud(openShop, returnToMenu, () => cancelPlacement(), () => toggleEditor());
const debug = createDebugPanel();
const quests = createQuestPanel();
const editor = createEditorPanel({
  onMove: () => world?.moveSelected(),
  onRotate: () => world?.rotateSelected(),
  onDelete: () => {
    const id = getSelectedId();
    const item = state.furniture.find((candidate) => candidate.id === id);
    if (!item || !world) return;
    const refund = Math.floor(CATALOG[item.kind].price * 0.5);
    if (window.confirm(`Удалить «${CATALOG[item.kind].name}» и вернуть ${refund} монет?`)) world.removeSelected();
  },
  onClose: () => toggleEditor(false),
});
let selectedId: string | null = null;
const shop = createShopPanel({
  onHire: () => { hireWaiter(state); storage.save(state); },
  onLimit: () => { increaseGuestLimit(state); storage.save(state); },
  onExpand: () => { expandRestaurant(state); storage.save(state); },
  onPlace: (kind: FurnitureKind) => {
    shop.close();
    world?.setPlacementMode(kind);
    hud.setPlacement(CATALOG[kind].name);
  },
  onMoveDoor: () => {
    shop.close();
    world?.setDoorMoveMode(true);
    hud.setPlacement('Дверь на границе');
  },
});
const menu = createMainMenu({
  onPlay: play,
  onNewGame: resetGame,
  onSoundChange: (enabled) => localStorage.setItem('moy-restoran:sound', enabled ? 'on' : 'off'),
});
menu.setBalance(state.coins);
menu.show();
debug.setVisible(false);
quests.setVisible(false);
editor.setVisible(false);

function getSelectedId(): string | null { return selectedId; }

function openShop(): void {
  if (editing) toggleEditor(false);
  shop.open();
}

function toggleEditor(force?: boolean): void {
  editing = force ?? !editing;
  cancelPlacement();
  shop.close();
  world?.setEditorMode(editing);
  editor.setVisible(editing);
}

function cancelPlacement(): void {
  world?.cancelPlacement();
  hud.setPlacement(null);
}

function play(): void {
  menu.hide();
  container.hidden = false;
  hud.setVisible(true);
  shop.setVisible(true);
  debug.setVisible(true);
  quests.setVisible(true);
  if (!world) {
    try {
      world = new RestaurantWorld(container, state, {
        onChange: () => storage.save(state),
        onPlacementEnd: () => hud.setPlacement(null),
        onPlacementError: (reason) => hud.setPlacement('выбранный объект', reason),
        onSelect: (id, moving) => {
          selectedId = id;
          editor.setSelected(state.furniture.find((item) => item.id === id) ?? null, moving);
        },
        onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
        onFrame: () => { hud.update(state); shop.update(state); debug.update(state); quests.update(state); },
      });
    } catch {
      container.textContent = 'Не удалось запустить 3D-режим. Проверьте, поддерживает ли браузер WebGL.';
      container.style.cssText = 'display:grid;place-items:center;padding:24px;color:#3d2d24;font:20px sans-serif';
      return;
    }
  }
  hud.update(state);
  shop.update(state);
  quests.update(state);
  world.start();
}

function returnToMenu(): void {
  if (world) {
    toggleEditor(false);
    cancelPlacement();
    storage.save(state);
    world.stop();
  }
  container.hidden = true;
  hud.setPlacement(null);
  hud.setVisible(false);
  shop.setVisible(false);
  debug.setVisible(false);
  quests.setVisible(false);
  editor.setVisible(false);
  menu.setBalance(state.coins);
  menu.show();
}

function resetGame(): void {
  world?.dispose();
  world = undefined;
  editing = false;
  selectedId = null;
  editor.setVisible(false);
  container.replaceChildren();
  storage.reset();
  state = createGame();
  storage.save(state);
  play();
}
