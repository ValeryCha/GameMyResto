import type { GameState } from '../simulation/types';
import { getHudModel } from '../simulation/selectors';

export function createHud(onPlant: () => void) {
  const root = document.createElement('section');
  root.style.cssText = 'position:fixed;top:12px;left:12px;padding:12px;background:#fff8e8;border:2px solid #75543b;border-radius:12px;font:16px sans-serif;color:#3d2d24';
  const text = document.createElement('div');
  const plant = document.createElement('button');
  plant.textContent = 'Купить растение — 50 монет';
  plant.addEventListener('click', onPlant);
  root.append(text, plant);
  document.body.append(root);
  return {
    update(state: GameState) {
      const model = getHudModel(state);
      text.textContent = `Монеты: ${model.coins} · Опыт: ${model.experience} · Популярность: ${model.popularity} · Гости: ${model.guests}`;
      plant.disabled = state.coins < 50;
    },
  };
}
