import './ui/styles.css';
import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantWorld } from './render3d/RestaurantWorld';
import { createGame } from './simulation/createGame';
import { CATALOG } from './content/coreContent';
import { expandRestaurant, hireWaiter, increaseGuestLimit } from './simulation/shop';
import type { FurnitureKind } from './simulation/types';
import { createHud } from './ui/hud';
import { createMainMenu } from './ui/mainMenu';
import { createShopPanel } from './ui/shopPanel';

const storage = new LocalStorageAdapter(window.localStorage);
const container = document.querySelector<HTMLElement>('#game')!;
container.hidden = true;
let state = storage.load();
let world: RestaurantWorld | undefined;

const hud = createHud(() => shop.open(), returnToMenu, () => cancelPlacement());
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

function cancelPlacement(): void {
  world?.cancelPlacement();
  hud.setPlacement(null);
}

function play(): void {
  menu.hide();
  container.hidden = false;
  hud.setVisible(true);
  shop.setVisible(true);
  if (!world) {
    try {
      world = new RestaurantWorld(container, state, {
        onChange: () => storage.save(state),
        onPlacementEnd: () => hud.setPlacement(null),
        onPlacementError: (reason) => hud.setPlacement('выбранный объект', reason),
        onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
        onFrame: () => { hud.update(state); shop.update(state); },
      });
    } catch {
      container.textContent = 'Не удалось запустить 3D-режим. Проверьте, поддерживает ли браузер WebGL.';
      container.style.cssText = 'display:grid;place-items:center;padding:24px;color:#3d2d24;font:20px sans-serif';
      return;
    }
  }
  hud.update(state);
  shop.update(state);
  world.start();
}

function returnToMenu(): void {
  if (world) {
    cancelPlacement();
    storage.save(state);
    world.stop();
  }
  container.hidden = true;
  hud.setPlacement(null);
  hud.setVisible(false);
  shop.setVisible(false);
  menu.setBalance(state.coins);
  menu.show();
}

function resetGame(): void {
  world?.dispose();
  world = undefined;
  container.replaceChildren();
  storage.reset();
  state = createGame();
  storage.save(state);
  play();
}
