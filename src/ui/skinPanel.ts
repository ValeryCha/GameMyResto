import './skinPanel.css';
import { furnitureSkinById } from '../content/furnitureSkins';

interface SkinPanelCallbacks { onAll(skinId: string): void; onOne(skinId: string): void; onClose(): void }
export function createSkinPanel(callbacks: SkinPanelCallbacks) {
  const root = document.createElement('aside'); root.className = 'skin-panel'; root.hidden = true; root.setAttribute('aria-label', 'Применение скина');
  const title = document.createElement('strong');
  const hint = document.createElement('span'); hint.textContent = 'Применить к существующим объектам или выбрать один в ресторане';
  const all = document.createElement('button'); all.textContent = 'Применить на все';
  const one = document.createElement('button'); one.textContent = 'Применить к 1';
  const cancel = document.createElement('button'); cancel.textContent = 'Отмена';
  let skinId = '';
  all.addEventListener('click', () => { callbacks.onAll(skinId); root.hidden = true; });
  one.addEventListener('click', () => { callbacks.onOne(skinId); root.hidden = true; });
  cancel.addEventListener('click', () => { root.hidden = true; callbacks.onClose(); });
  root.append(title, hint, all, one, cancel); document.body.append(root);
  return {
    open(id: string) { skinId = id; title.textContent = furnitureSkinById(id)?.name ?? 'Скин'; root.hidden = false; },
    close() { root.hidden = true; },
    setVisible(visible: boolean) { root.hidden = !visible; },
  };
}
