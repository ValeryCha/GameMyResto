import Phaser from 'phaser';
import type { GameState } from '../simulation/types';
import { advanceSimulation } from '../simulation/tick';
import { placeFurniture } from '../simulation/commands';
import { gridToScreen, screenToGrid } from './iso';

export class RestaurantScene extends Phaser.Scene {
  constructor(private state: GameState) { super('restaurant'); }
  private graphics!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private plantMode = false;

  setPlantMode(enabled: boolean) { this.plantMode = enabled; }

  create() {
    this.graphics = this.add.graphics();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.plantMode) return;
      this.plantMode = false;
      placeFurniture(this.state, 'plant', screenToGrid(pointer.position));
    });
  }

  update(_time: number, delta: number) {
    this.accumulator += delta;
    while (this.accumulator >= 1_000) { advanceSimulation(this.state); this.accumulator -= 1_000; }
    this.draw();
  }

  private draw() {
    this.graphics.clear();
    for (let y = 0; y < this.state.height; y += 1) for (let x = 0; x < this.state.width; x += 1) {
      const p = gridToScreen({ x, y });
      this.graphics.fillStyle((x + y) % 2 ? 0xf4dfbd : 0xffedcf).fillTriangle(p.x, p.y - 16, p.x + 32, p.y, p.x, p.y + 16).fillTriangle(p.x, p.y - 16, p.x - 32, p.y, p.x, p.y + 16);
      this.graphics.lineStyle(1, 0x9a7657).strokeTriangle(p.x, p.y - 16, p.x + 32, p.y, p.x, p.y + 16).strokeTriangle(p.x, p.y - 16, p.x - 32, p.y, p.x, p.y + 16);
    }
    const objects = [
      ...this.state.furniture.map((item) => ({ ...item, color: item.kind === 'stove' ? 0x607080 : item.kind === 'plant' ? 0x4d9a55 : 0xb87342 })),
      ...this.state.employees.map((item) => ({ ...item, color: item.role === 'chef' ? 0xffffff : 0x437fc4 })),
      ...this.state.customers.map((item) => ({ ...item, color: 0xd56b75 })),
    ].sort((a, b) => a.position.x + a.position.y - b.position.x - b.position.y);
    for (const object of objects) {
      const p = gridToScreen(object.position);
      this.graphics.fillStyle(object.color).fillCircle(p.x, p.y - 12, 10).lineStyle(2, 0x46362b).strokeCircle(p.x, p.y - 12, 10);
    }
  }
}
