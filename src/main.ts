import './ui/styles.css';
import { LocalStorageAdapter } from './persistence/localStorageAdapter';
import { RestaurantWorld } from './render3d/RestaurantWorld';
import { createGame } from './simulation/createGame';
import { CATALOG } from './content/coreContent';
import { addTestFunds, buyCookingUpgrade, buyRecipe, buyWaiterUpgrade, expandRestaurant, hireChef, hireWaiter, increaseGuestLimit } from './simulation/shop';
import { claimCalendarReward } from './simulation/calendar';
import { purchaseFurnitureBatch } from './simulation/inventory';
import { buyOrApplyDoor, buyOrApplyFloor, buyOrApplyWallpaper, removeDoorPattern, removeFloor, removeWallpaper } from './simulation/decorations';
import { applyFurnitureSkin, buyFurnitureSkin, buyLoyaltyItem, buyPainting, removePainting } from './simulation/catalogDecorations';
import { floorPatternById } from './content/floors';
import { wallpaperById } from './content/wallpapers';
import { doorPatternById } from './content/doors';
import { furnitureSkinById } from './content/furnitureSkins';
import { windowById } from './content/windows';
import { buyWindow, removeWindow } from './simulation/wallWindows';
import { paintingById } from './content/paintings';
import { loyaltyItemById } from './content/loyalty';
import type { FurnitureKind } from './simulation/types';
import { createHud } from './ui/hud';
import { createQuestPanel } from './ui/questPanel';
import { createEditorPanel } from './ui/editorPanel';
import { createMainMenu } from './ui/mainMenu';
import { createShopPanel, type DecorationSection } from './ui/shopPanel';
import { calculateDecorationRating } from './simulation/rating';
import { createCalendarPanel } from './ui/calendarPanel';

const storage = new LocalStorageAdapter(window.localStorage);
const container = document.querySelector<HTMLElement>('#game')!;
container.hidden = true;
let state = storage.load();
let world: RestaurantWorld | undefined;
let editing = false;
let lastUiUpdate = 0;

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const hud = createHud({
  onShop: openShop,
  onMenu: returnToMenu,
  onCancel: () => cancelPlacement(),
  onEditor: () => toggleEditor(),
  onProgress: openProgress,
  onCalendar: openCalendar,
});
const quests = createQuestPanel(() => closePanels());
const editor = createEditorPanel({
  onMove: () => world?.moveSelected(),
  onRotate: () => world?.rotateSelected(),
  onDelete: () => {
    const item = state.furniture.find((candidate) => candidate.id === getSelectedId());
    if (!item || !world) return;
    const refund = Math.floor(CATALOG[item.kind].price * 0.5);
    world.removeSelected();
    hud.notify(`Предмет продан · возвращено ${refund} монет`);
  },
  onRemoveWallpaper: () => removeDecoration('wallpaper'),
  onRemoveFloor: () => removeDecoration('floor'),
  onRemoveDoor: () => removeDecoration('door'),
  onRemovePainting: (id) => {
    const placed = state.appliedPaintings.find((candidate) => candidate.id === id);
    const painting = placed ? paintingById(placed.paintingId) : undefined;
    if (!placed || !painting) return;
    const result = removePainting(state, id);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось убрать картину');
    storage.save(state); editor.update(state); shop.update(state); hud.update(state, localDate());
    hud.notify(`Картина убрана · возвращено ${Math.floor(painting.price / 2)} монет`);
  },
  onRemoveWindow: (id) => {
    const placed = (state.appliedWindows ?? []).find((candidate) => candidate.id === id);
    const windowItem = placed ? windowById(placed.windowId) : undefined;
    if (!placed || !windowItem) return;
    const result = removeWindow(state, id);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось убрать окно');
    storage.save(state); editor.setWallDecoration(null); editor.update(state); shop.update(state); hud.update(state, localDate());
    hud.notify(`Окно продано · возвращено ${Math.floor(windowItem.price / 2)} монет`);
  },
  onMoveWindow: (id) => {
    world?.setWindowMoveMode(id);
    hud.setPlacement('Перемещение окна · выберите новую клетку стены · Escape/Готово — отмена');
  },
  onMovePainting: (id) => {
    world?.setPaintingMoveMode(id);
    hud.setPlacement('Перемещение картины · выберите новый участок стены · Escape/Готово — отмена');
  },
  onClose: () => toggleEditor(false),
});
let selectedId: string | null = null;
const overlay = document.createElement('button');
overlay.className = 'panel-overlay'; overlay.hidden = true; overlay.setAttribute('aria-label', 'Закрыть открытую панель');
overlay.addEventListener('click', () => { cancelPlacement(); if (editing) toggleEditor(false); else closePanels(); });
document.body.append(overlay);
const shop = createShopPanel({
  onResetDecoration: resetDecoration,
  onClose: () => closePanels(),
  onHire: () => { hireWaiter(state); storage.save(state); },
  onHireChef: () => {
    const result = hireChef(state);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось нанять повара');
    storage.save(state);
    hud.notify('Повар нанят и закреплён за свободной плитой');
  },
  onLimit: () => { increaseGuestLimit(state); storage.save(state); },
  onExpand: () => { expandRestaurant(state); storage.save(state); },
  onTestFunds: () => { addTestFunds(state); storage.save(state); },
  onCookingUpgrade: () => { buyCookingUpgrade(state); storage.save(state); },
  onWaiterUpgrade: () => { buyWaiterUpgrade(state); storage.save(state); },
  onBuyRecipe: (dishId) => { buyRecipe(state, dishId); storage.save(state); },
  onBuyOrApplyFloor: (floorId) => {
    const result = buyOrApplyFloor(state, floorId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось применить пол');
    const floor = floorPatternById(floorId)!;
    storage.save(state);
    shop.update(state);
    hud.update(state, localDate());
    hud.notify(`${floor.name}: покрытие применено ко всему ресторану`);
  },
  onBuyWallpaper: (wallpaperId) => {
    const result = buyOrApplyWallpaper(state, wallpaperId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось выбрать обои');
    const wallpaper = wallpaperById(wallpaperId)!;
    storage.save(state); shop.update(state); hud.update(state, localDate());
    closePanels();
    world?.setWallpaperMode(wallpaperId);
    hud.setPlacement(`${wallpaper.name} · клетка стены 1×1 · ${wallpaper.price} монет за клетку · Готово — выход`);
  },
  onBuyOrApplyDoor: (doorId) => {
    const result = buyOrApplyDoor(state, doorId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось применить дверь');
    storage.save(state); shop.update(state); hud.update(state, localDate());
    hud.notify(`${doorPatternById(doorId)!.name}: дверь установлена`);
  },
  onBuyFurnitureSkin: (skinId) => {
    const skin = furnitureSkinById(skinId);
    if (!skin) return hud.notify('Скин не найден');
    const targets = skin.kind === 'chef' || skin.kind === 'waiter'
      ? state.employees.filter((employee) => employee.role === skin.kind)
      : state.furniture.filter((item) => item.kind === skin.kind);
    if (!targets.length) return hud.notify('Сначала добавьте подходящий объект в ресторан');
    const result = buyFurnitureSkin(state, skinId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось купить скин');
    if (!state.firstPurchaseApplied.includes(skinId)) {
      const applied = applyFurnitureSkin(state, skinId);
      if (!applied.ok) return hud.notify(applied.reason ?? 'Не удалось применить скин');
      state.firstPurchaseApplied.push(skinId);
      storage.save(state); shop.update(state); hud.update(state, localDate());
      hud.notify(`${skin.name}: применено ко всем существующим объектам`);
      return;
    }
    storage.save(state); shop.update(state); hud.update(state, localDate());
    closePanels(); world?.setSkinMode(skinId);
    hud.setPlacement(`${skin.name} · выберите один объект · Escape/Готово — отмена`);
  },
  onBuyOrPlacePainting: (paintingId) => {
    const result = buyPainting(state, paintingId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось купить картину');
    storage.save(state); shop.update(state); hud.update(state, localDate());
    closePanels();
    world?.setPaintingMode(paintingId);
    hud.setPlacement(`${paintingById(paintingId)!.name} · выберите участок стены`);
  },
  onBuyWindow: (windowId) => {
    const result = buyWindow(state, windowId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось купить окно');
    storage.save(state); shop.update(state); hud.update(state, localDate());
    closePanels(); world?.setWindowMode(windowId);
    hud.setPlacement(`${windowById(windowId)!.name} · выберите клетку стены 1×1`);
  },
  onBuyLoyalty: (itemId) => {
    const result = buyLoyaltyItem(state, itemId);
    if (!result.ok) return hud.notify(result.reason ?? 'Не удалось купить улучшение');
    const item = loyaltyItemById(itemId)!;
    storage.save(state); shop.update(state); hud.update(state, localDate());
    hud.notify(`${item.name}: терпение гостей +${item.bonus}%`);
  },
  onPlace: (kind: FurnitureKind, quantity: number) => {
    const result = purchaseFurnitureBatch(state, kind, quantity);
    if (!result.ok) return;
    storage.save(state);
    closePanels();
    world?.setPlacementMode(kind);
    hud.setPlacement(`${CATALOG[kind].name} · следующий покупается автоматически`);
  },
  onMoveDoor: () => {
    closePanels();
    world?.setDoorMoveMode(true);
    hud.setPlacement('Дверь на границе');
  },
});
const calendar = createCalendarPanel({
  onClose: () => closePanels(),
  onClaim: () => {
    const result = claimCalendarReward(state, localDate());
    if (!result.ok) return undefined;
    storage.save(state);
    calendar.update(state, localDate());
    hud.update(state, localDate());
    return result.reward;
  },
});
const menu = createMainMenu({
  onPlay: play,
  onNewGame: resetGame,
  onSoundChange: (enabled) => localStorage.setItem('moy-restoran:sound', enabled ? 'on' : 'off'),
});
menu.setBalance(state.coins);
menu.show();
quests.setVisible(false);
editor.setVisible(false);
calendar.setVisible(false);

function getSelectedId(): string | null { return selectedId; }

function closePanels(): void {
  shop.close();
  quests.close();
  calendar.close();
  overlay.hidden = true;
  hud.setActivePanel(null);
}

function openShop(): void {
  if (editing) toggleEditor(false);
  cancelPlacement();
  closePanels();
  shop.open();
  overlay.hidden = false;
  hud.setActivePanel('shop');
}

function openProgress(): void {
  if (editing) toggleEditor(false);
  cancelPlacement();
  closePanels();
  quests.open();
  overlay.hidden = false;
  hud.setActivePanel('progress');
}

function openCalendar(): void {
  if (editing) toggleEditor(false);
  cancelPlacement();
  closePanels();
  calendar.update(state, localDate());
  calendar.open();
  overlay.hidden = false;
  hud.setActivePanel('calendar');
}

function toggleEditor(force?: boolean): void {
  editing = force ?? !editing;
  cancelPlacement();
  closePanels();
  const relocatedGuests = world?.setEditorMode(editing) ?? 0;
  if (!editing && relocatedGuests > 0) hud.notify(`Гости возвращены · безопасно пересажены: ${relocatedGuests}`);
  editor.setVisible(editing);
  editor.update(state);
  overlay.hidden = true;
  hud.setActivePanel(editing ? 'editor' : null);
}

function removeDecoration(kind: 'wallpaper' | 'floor' | 'door'): void {
  if (kind === 'wallpaper') {
    closePanels(); world?.setWallpaperRemoveMode(true);
    hud.setPlacement('Снятие обоев · выберите одну клетку · бесплатно · drag — камера'); return;
  }
  const result = kind === 'floor' ? removeFloor(state) : removeDoorPattern(state);
  if (!result.ok) return hud.notify(result.reason ?? 'Декорация не установлена');
  storage.save(state); editor.update(state); shop.update(state); hud.update(state, localDate());
  hud.notify('Стандартный вид восстановлен бесплатно');
}

function resetDecoration(section: DecorationSection): void {
  if (section === 'wallpapers' || section === 'floors' || section === 'doors') {
    removeDecoration(section === 'wallpapers' ? 'wallpaper' : section === 'floors' ? 'floor' : 'door'); return;
  }
  if (section === 'paintings' || section === 'windows') {
    const ids = section === 'paintings' ? [...state.appliedPaintings.map((item) => item.id)] : [...state.appliedWindows.map((item) => item.id)];
    for (const id of ids) section === 'paintings' ? removePainting(state, id) : removeWindow(state, id);
    storage.save(state); shop.update(state); hud.update(state, localDate()); hud.notify('Стандартный вид восстановлен бесплатно'); return;
  }
  const kinds = section === 'tables' ? ['table', 'tableDouble'] : section === 'chairs' ? ['chair'] : section === 'equipment' ? ['stove', 'counter'] : ['chef', 'waiter'];
  const ratingBefore = state.decorationRatingBonus;
  const keepFurniture = (assignment: { skinId: string }) => {
    const skin = furnitureSkinById(assignment.skinId);
    if (!skin || !kinds.includes(skin.kind)) return true;
    return false;
  };
  state.appliedFurnitureSkins = state.appliedFurnitureSkins.filter(keepFurniture);
  state.appliedStoveSkins = state.appliedStoveSkins.filter(keepFurniture);
  state.appliedCounterSkins = state.appliedCounterSkins.filter(keepFurniture);
  state.appliedChefSkins = state.appliedChefSkins.filter(keepFurniture);
  state.appliedWaiterSkins = state.appliedWaiterSkins.filter(keepFurniture);
  state.decorationRatingBonus = calculateDecorationRating(state);
  state.popularity = Math.max(0, Math.min(1000, state.popularity - Math.max(0, ratingBefore - state.decorationRatingBonus)));
  storage.save(state); shop.update(state); hud.update(state, localDate());
  hud.notify('Стандартный вид восстановлен бесплатно');
}

function cancelPlacement(): void {
  world?.cancelPlacement();
  hud.setPlacement(null);
}

function play(): void {
  menu.hide();
  container.hidden = false;
  hud.setVisible(true);
  shop.setVisible(true);
  quests.setVisible(true);
  calendar.setVisible(true);
  if (!world) {
    try {
      world = new RestaurantWorld(container, state, {
        onChange: () => {
          storage.save(state);
        },
        onPlacementEnd: () => hud.setPlacement(null),
        onPlacementProgress: (kind) => hud.setPlacement(`${CATALOG[kind].name} · следующий покупается автоматически`),
        onPlacementError: (reason) => hud.setPlacement('клетку стены 1×1', reason),
        onWallpaperApplied: () => {
          hud.update(state, localDate()); shop.update(state); hud.notify('Обои наклеены · клетка 1×1');
        },
        onSkinApplied: (skinId) => {
          storage.save(state); hud.update(state, localDate()); shop.update(state);
          hud.notify(`${furnitureSkinById(skinId)!.name}: скин применён к выбранному объекту`);
        },
        onWallDecorationSelect: (kind, id) => {
          if (!id) { editor.setWallDecoration(null); return; }
          const placed = kind === 'painting' ? state.appliedPaintings.find((item) => item.id === id) : (state.appliedWindows ?? []).find((item) => item.id === id);
          if (!placed) return;
          const name = kind === 'painting' ? paintingById((placed as typeof state.appliedPaintings[number]).paintingId)?.name : windowById((placed as typeof state.appliedWindows[number]).windowId)?.name;
          editor.setWallDecoration({ kind, id, name: name ?? 'Декорация' });
        },
        onSelect: (id, moving) => {
          selectedId = id;
          editor.setSelected(state.furniture.find((item) => item.id === id) ?? null, moving);
        },
        onSecond: () => { if (state.tick % 10 === 0) storage.save(state); },
        onFrame: () => {
          const now = performance.now();
          if (now - lastUiUpdate < 100) return;
          lastUiUpdate = now;
          hud.update(state, localDate());
          shop.update(state);
          quests.update(state);
          editor.update(state);
          calendar.update(state, localDate());
        },
      });
    } catch {
      container.textContent = 'Не удалось запустить 3D-режим. Проверьте, поддерживает ли браузер WebGL.';
      container.style.cssText = 'display:grid;place-items:center;padding:24px;color:#3d2d24;font:20px sans-serif';
      return;
    }
  }
  hud.update(state, localDate());
  shop.update(state);
  quests.update(state);
  calendar.update(state, localDate());
  world.start();
}

function returnToMenu(): void {
  if (world) {
    toggleEditor(false);
    cancelPlacement();
    storage.save(state);
    world.stop();
  }
  container.hidden = true;
  hud.setPlacement(null);
  hud.setVisible(false);
  shop.setVisible(false);
  quests.setVisible(false);
  calendar.setVisible(false);
  editor.setVisible(false);
  menu.setBalance(state.coins);
  menu.show();
}

function resetGame(): void {
  world?.dispose();
  world = undefined;
  editing = false;
  selectedId = null;
  editor.setVisible(false);
  container.replaceChildren();
  storage.reset();
  state = createGame();
  storage.save(state);
  play();
}
