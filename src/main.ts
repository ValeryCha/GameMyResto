import Phaser from 'phaser';
import { createGame } from './simulation/createGame';
import { RestaurantScene } from './render/RestaurantScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  backgroundColor: '#b9d9c2',
  scene: new RestaurantScene(createGame()),
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
