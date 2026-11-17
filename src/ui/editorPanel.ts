import './editorPanel.css';
import { CATALOG } from '../content/coreContent';
import type { Furniture, GameState } from '../simulation/types';
import { setButtonIcon } from './icons';

interface EditorCallbacks {
  onMove(): void;
  onRotate(): void;
  onDelete(): void;
  onRemoveWallpaper(): void;
  onRemoveFloor(): void;
  onRemoveDoor(): void;
  onRemovePainting(id: string): void;
  onMovePainting(id: string): void;
  onRemoveWindow(id: string): void;
  onMoveWindow(id: string): void;
  onClose(): void;
}
export type WallDecorationSelection = { kind: 'painting' | 'window'; id: string; name: string } | null;

export function createEditorPanel(callbacks: EditorCallbacks) {
  const root = document.createElement('aside');
  root.className = 'editor-panel'; root.hidden = true; root.setAttribute('aria-label', 'Редактор обстановки');
  const title = document.createElement('strong'); title.textContent = 'Выберите предмет';
  const hint = document.createElement('span'); hint.textContent = 'Нажмите на мебель или декорацию на стене';
  const move = document.createElement('button'); setButtonIcon(move, 'Переместить', 'move'); move.addEventListener('click', callbacks.onMove);
  const rotate = document.createElement('button'); setButtonIcon(rotate, 'Повернуть', 'rotate'); rotate.addEventListener('click', callbacks.onRotate);
  const remove = document.createElement('button'); setButtonIcon(remove, 'Продать · 50%', 'sell'); remove.addEventListener('click', callbacks.onDelete);
  const wallTitle = document.createElement('strong'); wallTitle.hidden = true;
  const wallMove = document.createElement('button'); setButtonIcon(wallMove, 'Переместить', 'move'); wallMove.hidden = true;
  const wallRemove = document.createElement('button'); setButtonIcon(wallRemove, 'Продать · 50%', 'sell'); wallRemove.hidden = true;
  const decorTitle = document.createElement('strong'); decorTitle.textContent = 'Стандартный вид · бесплатно';
  const wallpaper = document.createElement('button'); setButtonIcon(wallpaper, 'Снять обои с одной клетки', 'wallpaper'); wallpaper.dataset.removeDecoration = 'wallpaper'; wallpaper.addEventListener('click', callbacks.onRemoveWallpaper);
  const floor = document.createElement('button'); setButtonIcon(floor, 'Убрать пол', 'floor'); floor.dataset.removeDecoration = 'floor'; floor.addEventListener('click', callbacks.onRemoveFloor);
  const door = document.createElement('button'); setButtonIcon(door, 'Обычная дверь', 'door'); door.dataset.removeDecoration = 'door'; door.addEventListener('click', callbacks.onRemoveDoor);
  const close = document.createElement('button'); setButtonIcon(close, 'Вернуться в игру', 'close'); close.addEventListener('click', callbacks.onClose);
  root.append(title, hint, move, rotate, remove, wallTitle, wallMove, wallRemove, decorTitle, wallpaper, floor, door, close);
  document.body.append(root);
  let selection: WallDecorationSelection = null;
  wallMove.addEventListener('click', () => {
    if (!selection) return;
    if (selection.kind === 'painting') callbacks.onMovePainting(selection.id); else callbacks.onMoveWindow(selection.id);
  });
  wallRemove.addEventListener('click', () => {
    if (!selection) return;
    if (selection.kind === 'painting') callbacks.onRemovePainting(selection.id); else callbacks.onRemoveWindow(selection.id);
  });
  return {
    setVisible(visible: boolean) { root.hidden = !visible; if (!visible) { this.setSelected(null); this.setWallDecoration(null); } },
    setSelected(item: Furniture | null, moving = false) {
      if (item) this.setWallDecoration(null);
      title.textContent = item ? CATALOG[item.kind].name : 'Выберите предмет';
      hint.textContent = moving ? 'Выберите новую свободную клетку' : item ? 'Выберите действие' : 'Нажмите на мебель или декорацию на стене';
      move.disabled = !item || item.kind === 'door'; rotate.disabled = !item; remove.disabled = !item || item.kind === 'door';
      setButtonIcon(move, moving ? 'Отменить перемещение' : 'Переместить', moving ? 'close' : 'move');
    },
    setWallDecoration(value: WallDecorationSelection) {
      selection = value;
      wallTitle.hidden = wallMove.hidden = wallRemove.hidden = !value;
      if (value) {
        title.textContent = 'Декорация на стене'; hint.textContent = 'Перемещение бесплатное';
        wallTitle.textContent = value.name;
        wallMove.dataset[value.kind === 'painting' ? 'movePainting' : 'moveWindow'] = value.id;
        wallRemove.dataset[value.kind === 'painting' ? 'removePainting' : 'removeWindow'] = value.id;
        move.disabled = rotate.disabled = remove.disabled = true;
      } else {
        delete wallMove.dataset.movePainting; delete wallMove.dataset.moveWindow;
        delete wallRemove.dataset.removePainting; delete wallRemove.dataset.removeWindow;
      }
    },
    update(state: GameState) {
      wallpaper.disabled = state.appliedWallpapers.length === 0;
      floor.disabled = !state.activeFloorPattern;
      door.disabled = !state.activeDoorPattern;
      if (selection) {
        const exists = selection.kind === 'painting' ? state.appliedPaintings.some((item) => item.id === selection!.id) : (state.appliedWindows ?? []).some((item) => item.id === selection!.id);
        if (!exists) this.setWallDecoration(null);
      }
    },
  };
}
