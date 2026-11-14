import type { GameState } from '../simulation/types';
import { getHudModel } from '../simulation/selectors';

export function createHud(onShop: () => void, onMenu: () => void, onCancel: () => void) {
  const root = document.createElement('section');
  root.hidden = true;
  root.setAttribute('aria-label', 'Показатели ресторана');
  root.style.cssText = 'position:fixed;z-index:2;top:16px;left:16px;max-width:calc(100vw - 64px);padding:14px 16px;background:#fff7e8;border:2px solid #80563b;border-radius:16px;box-shadow:0 6px 0 #80563b33,0 12px 28px #49332222;font:15px/1.3 system-ui,sans-serif;color:#3d2d24';
  const text = document.createElement('div');
  text.dataset.testid = 'hud-status';
  text.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 18px;font-weight:650';
  const values: Record<string, HTMLSpanElement> = {};
  for (const [key, label] of [['coins', 'Монеты'], ['experience', 'Опыт'], ['popularity', 'Рейтинг'], ['guests', 'Гости']]) {
    const item = document.createElement('span');
    item.textContent = `${label}: `;
    const value = document.createElement('span');
    value.style.color = '#9b512e';
    item.append(value);
    values[key] = value;
    text.append(item);
  }
  const shop = document.createElement('button');
  shop.textContent = 'Магазин';
  shop.style.cssText = 'margin-top:12px;padding:9px 14px;border:1px solid #49703b;border-radius:9px;background:#56824a;color:white;font:600 14px system-ui,sans-serif;box-shadow:0 3px 0 #385631';
  shop.addEventListener('click', onShop);
  const hint = document.createElement('div');
  hint.hidden = true;
  hint.style.cssText = 'margin-top:10px;color:#8b4b2d;font-weight:600';
  const hintText = document.createElement('span');
  const cancel = document.createElement('button');
  cancel.textContent = 'Отмена';
  cancel.style.cssText = 'margin-left:10px;padding:5px 9px';
  cancel.addEventListener('click', onCancel);
  hint.append(hintText, cancel);
  const menu = document.createElement('button');
  menu.textContent = 'Меню';
  menu.className = 'hud-menu-button';
  menu.style.cssText = shop.style.cssText;
  menu.addEventListener('click', onMenu);
  root.append(text, shop, menu, hint);
  document.body.append(root);
  return {
    update(state: GameState) {
      const model = getHudModel(state);
      values.coins.textContent = String(model.coins);
      values.experience.textContent = String(model.experience);
      values.popularity.textContent = model.popularity;
      values.guests.textContent = String(model.guests);
    },
    setPlacement(label: string | null, reason?: string) {
      hint.hidden = !label;
      hintText.textContent = reason || (label ? `Выберите клетку: ${label}` : '');
    },
    setVisible(visible: boolean) { root.hidden = !visible; },
  };
}
