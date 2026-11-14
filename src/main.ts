import Phaser from 'phaser';
import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantScene } from './render/RestaurantScene';
import { createHud } from './ui/hud';

const storage = new LocalStorageAdapter(window.localStorage);
const state = storage.load();
const save = () => storage.save(state);
const scene = new RestaurantScene(state, save, () => {
  if (state.tick % 10 === 0) save();
}, () => hud.update(state));
const hud = createHud(() => scene.setPlantMode(true));

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#b9d9c2',
  scene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
