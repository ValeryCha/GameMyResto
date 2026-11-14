import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantWorld } from './render3d/RestaurantWorld';
import { createHud } from './ui/hud';

const storage = new LocalStorageAdapter(window.localStorage);
const state = storage.load();
const container = document.querySelector<HTMLElement>('#game')!;
const hud = createHud(() => {
  world.setPlantMode(true);
  hud.setPlantMode(true);
});

let world: RestaurantWorld;
try {
  world = new RestaurantWorld(container, state, {
    onChange: () => storage.save(state),
    onPlacementEnd: () => hud.setPlantMode(false),
    onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
    onFrame: () => hud.update(state),
  });
  world.start();
} catch {
  container.textContent = 'Не удалось запустить 3D-режим. Проверьте, поддерживает ли браузер WebGL.';
  container.style.cssText = 'display:grid;place-items:center;padding:24px;color:#3d2d24;font:20px sans-serif';
}
