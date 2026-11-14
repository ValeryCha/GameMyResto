import './editorPanel.css';
import { CATALOG } from '../content/coreContent';
import type { Furniture } from '../simulation/types';

interface EditorCallbacks {
  onMove(): void;
  onRotate(): void;
  onDelete(): void;
  onClose(): void;
}

export function createEditorPanel(callbacks: EditorCallbacks) {
  const root = document.createElement('aside');
  root.className = 'editor-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Редактор обстановки');
  const title = document.createElement('strong');
  title.textContent = 'Выберите предмет';
  const hint = document.createElement('span');
  hint.textContent = 'Нажмите на мебель в ресторане';
  const move = document.createElement('button');
  move.textContent = 'Переместить';
  move.addEventListener('click', callbacks.onMove);
  const rotate = document.createElement('button');
  rotate.textContent = 'Повернуть';
  rotate.addEventListener('click', callbacks.onRotate);
  const remove = document.createElement('button');
  remove.textContent = 'Удалить';
  remove.addEventListener('click', callbacks.onDelete);
  const close = document.createElement('button');
  close.textContent = 'Вернуться в игру';
  close.addEventListener('click', callbacks.onClose);
  root.append(title, hint, move, rotate, remove, close);
  document.body.append(root);
  return {
    setVisible(visible: boolean) {
      root.hidden = !visible;
      if (!visible) this.setSelected(null);
    },
    setSelected(item: Furniture | null, moving = false) {
      title.textContent = item ? CATALOG[item.kind].name : 'Выберите предмет';
      hint.textContent = moving ? 'Выберите новую свободную клетку' : item ? 'Выберите действие' : 'Нажмите на мебель в ресторане';
      move.disabled = !item || item.kind === 'door';
      rotate.disabled = !item;
      remove.disabled = !item || item.kind === 'door';
      move.textContent = moving ? 'Отменить перемещение' : 'Переместить';
    },
  };
}
