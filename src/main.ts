import './ui/styles.css';
import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantWorld } from './render3d/RestaurantWorld';
import { createGame } from './simulation/createGame';
import { createHud } from './ui/hud';
import { createMainMenu } from './ui/mainMenu';

const storage = new LocalStorageAdapter(window.localStorage);
const container = document.querySelector<HTMLElement>('#game')!;
container.hidden = true;
let state = storage.load();
let world: RestaurantWorld | undefined;

const hud = createHud(() => {
  world?.setPlantMode(true);
  hud.setPlantMode(true);
}, returnToMenu);

const menu = createMainMenu({
  onPlay: play,
  onNewGame: resetGame,
  onSoundChange: (enabled) => localStorage.setItem('moy-restoran:sound', enabled ? 'on' : 'off'),
});
menu.setBalance(state.coins);
menu.show();

function play(): void {
  menu.hide();
  container.hidden = false;
  hud.setVisible(true);
  if (!world) {
    try {
      world = new RestaurantWorld(container, state, {
        onChange: () => storage.save(state),
        onPlacementEnd: () => hud.setPlantMode(false),
        onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
        onFrame: () => hud.update(state),
      });
    } catch {
      container.textContent = 'Не удалось запустить 3D-режим. Проверьте, поддерживает ли браузер WebGL.';
      container.style.cssText = 'display:grid;place-items:center;padding:24px;color:#3d2d24;font:20px sans-serif';
      return;
    }
  }
  hud.update(state);
  world.start();
}

function returnToMenu(): void {
  if (world) {
    storage.save(state);
    world.stop();
  }
  container.hidden = true;
  hud.setPlantMode(false);
  hud.setVisible(false);
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
