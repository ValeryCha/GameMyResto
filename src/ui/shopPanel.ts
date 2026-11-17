import './shopPanel.css';
import { DISHES, recipeCost } from '../content/dishes';
import { DOOR_PATTERNS, doorPatternById, doorPreview } from '../content/doors';
import { FLOOR_PATTERNS, floorPatternById, floorPreview } from '../content/floors';
import { FURNITURE_SKINS, furnitureSkinById, furnitureSkinPreview } from '../content/furnitureSkins';
import { LOYALTY_ITEMS, loyaltyItemById } from '../content/loyalty';
import { PAINTINGS, paintingById, paintingPreview } from '../content/paintings';
import { WINDOWS, windowById } from '../content/windows';
import { createShopThumbnail } from './shopThumbnails';
import { WALLPAPERS, wallpaperById, wallpaperPreview } from '../content/wallpapers';
import { guestSlotPrice, levelGuestLimit, MAX_PURCHASED_SLOTS } from '../simulation/guestLimits';
import { assignedSkinId, loyaltyBonus } from '../simulation/catalogDecorations';
import { UPGRADE_LEVELS } from '../simulation/shop';
import { MAX_UPGRADE_LEVEL, MAX_WAITERS, upgradePrice, waiterHirePrice } from '../simulation/staff';
import type { FurnitureKind, GameState } from '../simulation/types';
import { createDishIcon, createIcon, setButtonIcon, type IconName } from './icons';
import { pageBounds } from './pagination';

export type ShopCategory = 'kitchen' | 'hall' | 'staff' | 'recipes' | 'decorations' | 'loyalty';
export type DecorationSection = 'wallpapers' | 'floors' | 'doors' | 'tables' | 'chairs' | 'equipment' | 'team' | 'paintings' | 'windows';
export type ShopItem = {
  id: string; label: string; icon: IconName; price?: number; category: ShopCategory;
  furniture?: FurnitureKind; upgrade?: 'cooking' | 'waiter'; dishId?: string; wallpaperId?: string;
  floorId?: string; doorId?: string; furnitureSkinId?: string; paintingId?: string; windowId?: string; loyaltyId?: string;
};
export const SHOP_CATEGORIES: { id: ShopCategory; label: string; icon: IconName }[] = [
  { id: 'kitchen', label: 'Кухня', icon: 'kitchen' }, { id: 'hall', label: 'Зал', icon: 'hall' },
  { id: 'staff', label: 'Персонал', icon: 'staff' }, { id: 'recipes', label: 'Рецепты', icon: 'recipe' },
  { id: 'decorations', label: 'Декорации', icon: 'decor' }, { id: 'loyalty', label: 'Лояльность', icon: 'rating' },
];
const BASE_ITEMS: ShopItem[] = [
  { id: 'cookingUpgrade', label: 'Ускорение кухни', icon: 'speed', category: 'kitchen', upgrade: 'cooking' },
  { id: 'counter', label: 'Стойка выдачи', icon: 'counter', price: 300, category: 'kitchen', furniture: 'counter' },
  { id: 'waiter', label: 'Официант', icon: 'waiter', price: 200, category: 'staff' },
  { id: 'waiterUpgrade', label: 'Тренировка официанта', icon: 'training', category: 'staff', upgrade: 'waiter' },
  { id: 'table', label: 'Одиночный стол', icon: 'table', price: 100, category: 'hall', furniture: 'table' },
  { id: 'tableDouble', label: 'Двойной стол', icon: 'tableDouble', price: 200, category: 'hall', furniture: 'tableDouble' },
  { id: 'chair', label: 'Стул', icon: 'chair', price: 75, category: 'hall', furniture: 'chair' },
  { id: 'door', label: 'Перенести дверь', icon: 'door', price: 100, category: 'hall' },
  { id: 'limit', label: '+1 гость', icon: 'guest', price: 2500, category: 'hall' },
  { id: 'expand', label: 'Расширить', icon: 'expand', price: 50000, category: 'hall' },
];
export const SHOP_ITEMS: ShopItem[] = [
  ...BASE_ITEMS,
  ...DISHES.filter((dish) => dish.unlockLevel > 1).map((dish) => ({
    id: `recipe-${dish.id}`, label: dish.name, icon: 'recipe' as const, category: 'recipes' as const, dishId: dish.id,
  })),
  ...WALLPAPERS.map((wallpaper) => ({
    id: `wallpaper-${wallpaper.id}`, label: wallpaper.name, icon: 'decor' as const,
    category: 'decorations' as const, wallpaperId: wallpaper.id,
  })),
  ...FLOOR_PATTERNS.map((floor) => ({
    id: `floor-${floor.id}`, label: floor.name, icon: 'decor' as const,
    category: 'decorations' as const, floorId: floor.id,
  })),
  ...DOOR_PATTERNS.map((door) => ({
    id: `door-${door.id}`, label: door.name, icon: 'door' as const,
    category: 'decorations' as const, doorId: door.id,
  })),
  ...FURNITURE_SKINS.map((skin) => ({
    id: `skin-${skin.id}`, label: skin.name,
    icon: skin.kind === 'chair' ? 'chair' as const : skin.kind === 'tableDouble' ? 'tableDouble' as const
      : skin.kind === 'stove' ? 'kitchen' as const : skin.kind === 'counter' ? 'counter' as const
        : skin.kind === 'chef' || skin.kind === 'waiter' ? 'staff' as const : 'table' as const,
    category: 'decorations' as const, furnitureSkinId: skin.id,
  })),
  ...PAINTINGS.map((painting) => ({
    id: `painting-${painting.id}`, label: painting.name, icon: 'decor' as const,
    category: 'decorations' as const, paintingId: painting.id,
  })),
  ...WINDOWS.map((windowItem) => ({ id: `window-${windowItem.id}`, label: windowItem.name, icon: 'decor' as const, category: 'decorations' as const, windowId: windowItem.id })),
  ...LOYALTY_ITEMS.map((item) => ({
    id: `loyalty-${item.id}`, label: item.name, icon: item.icon, category: 'loyalty' as const, loyaltyId: item.id,
  })),
];
export function getItemPrice(state: GameState, item: ShopItem): number {
  if (item.dishId) return recipeCost(DISHES.find((candidate) => candidate.id === item.dishId)!.unlockLevel);
  if (item.wallpaperId) return wallpaperById(item.wallpaperId)!.price;
  if (item.floorId) return floorPatternById(item.floorId)!.price;
  if (item.doorId) return doorPatternById(item.doorId)!.price;
  if (item.furnitureSkinId) return furnitureSkinById(item.furnitureSkinId)!.price;
  if (item.paintingId) return paintingById(item.paintingId)!.price;
  if (item.windowId) return windowById(item.windowId)!.price;
  if (item.loyaltyId) return loyaltyItemById(item.loyaltyId)!.price;
  if (item.id === 'waiter') return waiterHirePrice(state.employees.filter((employee) => employee.role === 'waiter').length);
  if (item.id === 'limit') return guestSlotPrice(state.purchasedGuestSlots);
  if (item.upgrade) return upgradePrice(item.upgrade, state.upgrades[item.upgrade]);
  return item.price ?? 0;
}
export function isLocked(state: GameState, item: ShopItem): boolean {
  if (item.dishId) return state.level < DISHES.find((dish) => dish.id === item.dishId)!.unlockLevel;
  if (item.wallpaperId) return state.level < wallpaperById(item.wallpaperId)!.level;
  if (item.floorId) return state.level < floorPatternById(item.floorId)!.level;
  if (item.doorId) return state.level < doorPatternById(item.doorId)!.level;
  if (item.furnitureSkinId) return state.level < furnitureSkinById(item.furnitureSkinId)!.level;
  if (item.paintingId) return state.level < paintingById(item.paintingId)!.level;
  if (item.windowId) return state.level < windowById(item.windowId)!.level;
  if (item.loyaltyId) return state.level < loyaltyItemById(item.loyaltyId)!.level;
  return Boolean(item.upgrade && state.level < UPGRADE_LEVELS[item.upgrade]);
}
export const canAfford = (state: GameState, item: ShopItem): boolean => state.coins >= getItemPrice(state, item);
export interface ShopCallbacks {
  onHire(): void; onLimit(): void; onExpand(): void; onPlace(kind: FurnitureKind, quantity: number): void;
  onMoveDoor(): void; onTestFunds(): void; onClose(): void; onCookingUpgrade(): void; onWaiterUpgrade(): void; onBuyRecipe(dishId: string): void;
  onBuyWallpaper(wallpaperId: string): void; onBuyOrApplyFloor(floorId: string): void; onBuyOrApplyDoor(doorId: string): void;
  onResetDecoration(section: DecorationSection): void;
  onBuyFurnitureSkin(skinId: string): void; onBuyOrPlacePainting(paintingId: string): void; onBuyWindow(windowId: string): void; onBuyLoyalty(itemId: string): void;
}
type ItemElements = { button: HTMLButtonElement; iconWrap: HTMLSpanElement; iconKey: string; label: HTMLSpanElement; meta: HTMLElement; price: HTMLSpanElement; stock: HTMLSpanElement };
const DECORATION_SECTIONS: [DecorationSection, string][] = [
  ['wallpapers', 'Обои'], ['floors', 'Пол'], ['doors', 'Дверь'], ['tables', 'Столы'], ['chairs', 'Стулья'],
  ['equipment', 'Оборудование'], ['team', 'Персонал'], ['paintings', 'Картины'], ['windows', 'Окна'],
];
function setIcon(elements: ItemElements, item: ShopItem, locked: boolean): void {
  const key = `${locked ? 'lock' : 'open'}:${item.id}`;
  if (elements.iconKey === key) return;
  elements.iconWrap.replaceChildren();
  elements.iconWrap.style.removeProperty('background'); elements.iconWrap.style.removeProperty('color');
  elements.iconWrap.classList.remove('shop-item__icon--pattern', 'shop-item__icon--loyalty');
  const thumbnail = createShopThumbnail(item);
  if (thumbnail && !locked) elements.iconWrap.append(thumbnail);
  else {
    const dish = item.dishId ? DISHES.find((candidate) => candidate.id === item.dishId)! : undefined;
    const loyalty = item.loyaltyId ? loyaltyItemById(item.loyaltyId)! : undefined;
    if (loyalty && !locked) { elements.iconWrap.style.color = loyalty.color; elements.iconWrap.classList.add('shop-item__icon--loyalty'); }
    elements.iconWrap.append(dish && !locked ? createDishIcon(dish.id, dish.unlockLevel) : createIcon(locked ? 'lock' : item.icon));
  }
  elements.iconKey = key;
}
export function createShopPanel(callbacks: ShopCallbacks) {
  const root = document.createElement('aside');
  root.className = 'shop-panel'; root.hidden = true; root.setAttribute('aria-label', 'Магазин ресторана');
  const header = document.createElement('div'); header.className = 'shop-header';
  const title = document.createElement('strong'); title.className = 'shop-title'; title.append(createIcon('shop'), document.createTextNode('Магазин'));
  const closeButton = document.createElement('button'); setButtonIcon(closeButton, 'Закрыть', 'close'); closeButton.addEventListener('click', () => { closePanel(); callbacks.onClose(); });
  header.append(title, closeButton);
  const summary = document.createElement('div'); summary.className = 'shop-summary';
  const search = document.createElement('input'); search.type = 'search'; search.className = 'shop-search'; search.placeholder = 'Найти предмет по названию…'; search.setAttribute('aria-label', 'Поиск по магазину');
  const tabs = document.createElement('nav'); tabs.className = 'shop-tabs'; tabs.setAttribute('aria-label', 'Категории магазина'); tabs.setAttribute('role', 'tablist');
  let activeCategory: ShopCategory = 'kitchen';
  let decorationSection: DecorationSection = 'wallpapers';
  let currentPage = 1;
  const sections = new Map<string, HTMLElement>();
  const categoryButtons = new Map<ShopCategory, HTMLButtonElement>();
  const buttons = new Map<string, ItemElements>();
  const pageSize = () => window.innerWidth <= 600 ? 4 : window.innerWidth <= 850 ? 6 : 10;
  const refreshPagination = () => {
    const section = sections.get(activeCategory === 'decorations' ? `decorations-${decorationSection}` : activeCategory);
    if (!section) return;
    const query = search.value.trim().toLocaleLowerCase('ru');
    const entries = Array.from(section.querySelectorAll<HTMLButtonElement>('[data-shop-item], [data-reset-decoration]'));
    const matching = entries.filter((button) => {
      const item = button.dataset.shopItem ? SHOP_ITEMS.find((candidate) => candidate.id === button.dataset.shopItem)! : undefined;
      return !item || !query || item.label.toLocaleLowerCase('ru').includes(query);
    });
    const team = activeCategory === 'decorations' && decorationSection === 'team';
    let visible: HTMLButtonElement[];
    let pages: number;
    let groupLabel = '';
    if (team) {
      const groups = (['chef', 'waiter'] as const).map((role) => ({
        role,
        entries: matching.filter((button) => {
          const item = SHOP_ITEMS.find((candidate) => candidate.id === button.dataset.shopItem);
          return item?.furnitureSkinId && furnitureSkinById(item.furnitureSkinId)?.kind === role;
        }),
      })).filter((group) => group.entries.length > 0);
      pages = Math.max(1, groups.length);
      currentPage = Math.min(pages, Math.max(1, currentPage));
      visible = [...(groups[currentPage - 1]?.entries ?? [])];
      groupLabel = groups[currentPage - 1]?.role === 'chef' ? 'Повара' : groups[currentPage - 1]?.role === 'waiter' ? 'Официанты' : '';
      if (!query && currentPage === pages) visible.push(...matching.filter((button) => button.dataset.resetDecoration === 'team'));
    } else {
      const bounds = pageBounds(currentPage, matching.length, pageSize());
      currentPage = bounds.page;
      visible = matching.slice(bounds.start, bounds.end);
      pages = Math.max(1, Math.ceil(matching.length / pageSize()));
    }
    entries.forEach((button) => { button.hidden = true; });
    visible.forEach((button) => { button.hidden = false; });
    previousPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= pages;
    const status = `Страница ${currentPage} из ${pages}${groupLabel ? ` · ${groupLabel}` : ''}`;
    if (pageStatus.textContent !== status) pageStatus.textContent = status;
  };
  const showSections = () => {
    categoryButtons.forEach((button, id) => {
      const selected = id === activeCategory;
      button.classList.toggle('is-active', selected); button.setAttribute('aria-selected', String(selected));
    });
    sections.forEach((section, id) => {
      section.hidden = id !== activeCategory && id !== `${activeCategory}-${decorationSection}`;
    });
    refreshPagination();
  };
  const resetPage = () => { currentPage = 1; showSections(); };
  for (const category of SHOP_CATEGORIES) {
    const button = document.createElement('button'); button.className = 'shop-tab'; button.dataset.shopCategory = category.id;
    button.setAttribute('role', 'tab'); setButtonIcon(button, category.label, category.icon);
    const visibleLabel = document.createElement('span'); visibleLabel.className = 'shop-tab__label'; visibleLabel.textContent = category.label; visibleLabel.setAttribute('aria-hidden', 'true'); button.append(visibleLabel);
    button.addEventListener('click', () => { activeCategory = category.id; resetPage(); });
    categoryButtons.set(category.id, button); tabs.append(button);
  }
  search.addEventListener('input', resetPage);
  root.append(header, summary, search, tabs);
  const decorationTabs = document.createElement('nav'); decorationTabs.className = 'shop-subtabs'; decorationTabs.setAttribute('aria-label', 'Виды декораций');
  for (const [id, label] of DECORATION_SECTIONS) {
    const icons: Record<DecorationSection, IconName> = { wallpapers: 'wallpaper', floors: 'floor', doors: 'door', tables: 'table', chairs: 'chair', equipment: 'kitchen', team: 'staff', paintings: 'decor', windows: 'window' };
    const button = document.createElement('button'); button.dataset.decorationSection = id; setButtonIcon(button, label, icons[id]);
    button.addEventListener('click', () => {
      decorationSection = id;
      decorationTabs.querySelectorAll('button').forEach((entry) => entry.classList.toggle('is-active', entry === button));
      resetPage();
    });
    if (id === 'wallpapers') button.classList.add('is-active');
    decorationTabs.append(button);
  }
  root.append(decorationTabs);
  const catalogFrame = document.createElement('div'); catalogFrame.className = 'shop-catalog-frame';
  const previousPage = document.createElement('button'); previousPage.className = 'shop-page-arrow shop-page-arrow--previous'; setButtonIcon(previousPage, 'Предыдущая страница магазина', 'chevronLeft');
  const catalogBody = document.createElement('div'); catalogBody.className = 'shop-catalog-body';
  const nextPage = document.createElement('button'); nextPage.className = 'shop-page-arrow shop-page-arrow--next'; setButtonIcon(nextPage, 'Следующая страница магазина', 'chevronRight');
  const turnPage = (direction: -1 | 1) => {
    currentPage += direction;
    refreshPagination();
    catalogBody.classList.remove('is-page-forward', 'is-page-backward');
    void catalogBody.offsetWidth;
    catalogBody.classList.add(direction > 0 ? 'is-page-forward' : 'is-page-backward');
  };
  previousPage.addEventListener('click', () => turnPage(-1));
  nextPage.addEventListener('click', () => turnPage(1));
  catalogFrame.append(previousPage, catalogBody, nextPage);
  const pageStatus = document.createElement('div'); pageStatus.className = 'shop-page-status'; pageStatus.dataset.testid = 'shop-page-status'; pageStatus.setAttribute('role', 'status'); pageStatus.setAttribute('aria-live', 'polite');
  root.append(catalogFrame, pageStatus);
  window.addEventListener('resize', refreshPagination);
  function closePanel(): void { root.classList.remove('is-open'); currentPage = 1; refreshPagination(); }
  const appendItem = (section: HTMLElement, item: ShopItem) => {
    const button = document.createElement('button'); button.className = 'shop-item'; button.dataset.shopItem = item.id;
    if (item.dishId) button.dataset.dishId = item.dishId;
    if (item.wallpaperId) button.dataset.wallpaperId = item.wallpaperId;
    if (item.floorId) button.dataset.floorId = item.floorId;
    if (item.doorId) button.dataset.doorId = item.doorId;
    if (item.furnitureSkinId) button.dataset.furnitureSkinId = item.furnitureSkinId;
    if (item.paintingId) button.dataset.paintingId = item.paintingId;
    if (item.windowId) button.dataset.windowId = item.windowId;
    if (item.loyaltyId) button.dataset.loyaltyId = item.loyaltyId;
    const iconWrap = document.createElement('span'); iconWrap.className = 'shop-item__icon';
    const content = document.createElement('span'); content.className = 'shop-item__content';
    const label = document.createElement('span'); label.className = 'shop-item__label'; label.textContent = item.label;
    const meta = document.createElement('small'); meta.className = 'shop-item__meta'; content.append(label, meta);
    const price = document.createElement('span'); price.className = 'shop-item__price';
    const stock = document.createElement('span'); stock.className = 'shop-item__stock'; stock.hidden = true; stock.setAttribute('aria-hidden', 'true');
    button.append(iconWrap, content, price, stock);
    button.addEventListener('click', () => {
      if (item.furniture) callbacks.onPlace(item.furniture, 1);
      else if (item.id === 'waiter') callbacks.onHire(); else if (item.id === 'limit') callbacks.onLimit();
      else if (item.id === 'expand') callbacks.onExpand(); else if (item.id === 'door') callbacks.onMoveDoor();
      else if (item.id === 'cookingUpgrade') callbacks.onCookingUpgrade(); else if (item.id === 'waiterUpgrade') callbacks.onWaiterUpgrade();
      else if (item.dishId) callbacks.onBuyRecipe(item.dishId);
      else if (item.wallpaperId) callbacks.onBuyWallpaper(item.wallpaperId);
      else if (item.floorId) callbacks.onBuyOrApplyFloor(item.floorId);
      else if (item.doorId) callbacks.onBuyOrApplyDoor(item.doorId);
      else if (item.furnitureSkinId) callbacks.onBuyFurnitureSkin(item.furnitureSkinId);
      else if (item.paintingId) callbacks.onBuyOrPlacePainting(item.paintingId);
      else if (item.windowId) callbacks.onBuyWindow(item.windowId);
      else if (item.loyaltyId) callbacks.onBuyLoyalty(item.loyaltyId);
    });
    const elements = { button, iconWrap, iconKey: '', label, meta, price, stock }; setIcon(elements, item, false); buttons.set(item.id, elements); section.append(button);
  };
  for (const category of SHOP_CATEGORIES) {
    if (category.id === 'decorations') continue;
    const section = document.createElement('section'); section.className = `shop-category shop-category--${category.id}`; section.setAttribute('aria-label', category.label);
    for (const item of SHOP_ITEMS.filter((candidate) => candidate.category === category.id)) appendItem(section, item);
    sections.set(category.id, section); catalogBody.append(section);
  }
  for (const [id, label] of DECORATION_SECTIONS) {
    const section = document.createElement('section'); section.className = `shop-category shop-category--decorations shop-category--${id}`; section.setAttribute('aria-label', label);
    const reset = document.createElement('button'); reset.className = 'shop-reset'; reset.dataset.resetDecoration = id; setButtonIcon(reset, 'Стандартный вид · бесплатно', 'reset'); reset.addEventListener('click', () => callbacks.onResetDecoration(id));
    const matches = (item: ShopItem) => {
      const kind = item.furnitureSkinId ? furnitureSkinById(item.furnitureSkinId)?.kind : undefined;
      if (id === 'wallpapers') return item.wallpaperId;
      if (id === 'floors') return item.floorId;
      if (id === 'doors') return item.doorId;
      if (id === 'tables') return kind === 'table' || kind === 'tableDouble';
      if (id === 'chairs') return kind === 'chair';
      if (id === 'equipment') return kind === 'stove' || kind === 'counter';
      if (id === 'team') return kind === 'chef' || kind === 'waiter';
      if (id === 'windows') return item.windowId;
      return item.paintingId;
    };
    for (const item of SHOP_ITEMS.filter((candidate) => candidate.category === 'decorations' && matches(candidate))) appendItem(section, item);
    section.append(reset);
    sections.set(`decorations-${id}`, section); catalogBody.append(section);
  }
  const testSection = document.createElement('section'); testSection.className = 'shop-test';
  const testButton = document.createElement('button'); testButton.className = 'shop-item shop-test-button';
  setButtonIcon(testButton, '+50 000 монет', 'coins'); testButton.addEventListener('click', callbacks.onTestFunds);
  testSection.append(testButton); root.append(testSection); document.body.append(root); showSections();
  return {
    update(state: GameState) {
      summary.textContent = activeCategory === 'loyalty'
        ? `Баланс: ${state.coins} монет · Общий бонус терпения: +${loyaltyBonus(state)}% (максимум +100%)`
        : `Баланс: ${state.coins} монет · Рейтинг: ${Math.round(state.popularity)}`;
      decorationTabs.hidden = activeCategory !== 'decorations';
      root.querySelectorAll<HTMLButtonElement>('[data-reset-decoration]').forEach((button) => {
        const section = button.dataset.resetDecoration as DecorationSection;
        const kinds = section === 'tables' ? ['table', 'tableDouble'] : section === 'chairs' ? ['chair'] : section === 'equipment' ? ['stove', 'counter'] : section === 'team' ? ['chef', 'waiter'] : [];
        button.disabled = section === 'wallpapers' ? state.appliedWallpapers.length === 0
          : section === 'floors' ? !state.activeFloorPattern : section === 'doors' ? !state.activeDoorPattern
            : section === 'paintings' ? state.appliedPaintings.length === 0 : section === 'windows' ? state.appliedWindows.length === 0
              : ![...state.appliedFurnitureSkins, ...state.appliedStoveSkins, ...state.appliedCounterSkins].some((assignment) => kinds.includes(furnitureSkinById(assignment.skinId)?.kind ?? '')) &&
                ![...state.appliedChefSkins, ...state.appliedWaiterSkins].some((assignment) => kinds.includes(furnitureSkinById(assignment.skinId)?.kind ?? ''));
      });
      for (const item of SHOP_ITEMS) {
        const elements = buttons.get(item.id)!; const { button, label, meta, price } = elements;
        const dish = item.dishId ? DISHES.find((candidate) => candidate.id === item.dishId)! : undefined;
        const wallpaper = item.wallpaperId ? wallpaperById(item.wallpaperId)! : undefined;
        const floor = item.floorId ? floorPatternById(item.floorId)! : undefined;
        const door = item.doorId ? doorPatternById(item.doorId)! : undefined;
        const skin = item.furnitureSkinId ? furnitureSkinById(item.furnitureSkinId)! : undefined;
        const painting = item.paintingId ? paintingById(item.paintingId)! : undefined;
        const windowItem = item.windowId ? windowById(item.windowId)! : undefined;
        const loyalty = item.loyaltyId ? loyaltyItemById(item.loyaltyId)! : undefined;
        const wallpaperActive = Boolean(wallpaper && state.activeWallpaperId === wallpaper.id);
        const doorOwned = Boolean(door && state.ownedDoorPatterns.includes(door.id));
        const doorActive = Boolean(door && state.activeDoorPattern === door.id);
        const waiters = state.employees.filter((employee) => employee.role === 'waiter').length;
        const floorOwned = Boolean(floor && state.ownedFloorPatterns.includes(floor.id));
        const floorActive = Boolean(floor && state.activeFloorPattern === floor.id);
        const skinOwned = Boolean(skin && state.ownedFurnitureSkins.includes(skin.id));
        const skinTargets = skin ? skin.kind === 'chef' || skin.kind === 'waiter'
          ? state.employees.filter((employee) => employee.role === skin.kind).map((employee) => employee.id)
          : state.furniture.filter((furniture) => furniture.kind === skin.kind).map((furniture) => furniture.id) : [];
        const skinActive = Boolean(skin && skinTargets.some((id) => assignedSkinId(state, id) === skin.id));
        const paintingOwned = Boolean(painting && state.ownedPaintings.includes(painting.id));
        const loyaltyOwned = Boolean(loyalty && state.ownedLoyaltyItems.includes(loyalty.id));
        const maxed = Boolean((item.upgrade && state.upgrades[item.upgrade] >= MAX_UPGRADE_LEVEL) ||
          (item.id === 'waiter' && waiters >= MAX_WAITERS) || (dish && state.unlockedDishIds.includes(dish.id)) ||
          (item.id === 'limit' && state.purchasedGuestSlots >= MAX_PURCHASED_SLOTS) || loyaltyOwned);
        const locked = isLocked(state, item) && !maxed;
        const owned = floorOwned || doorOwned;
        const priceValue = loyaltyOwned ? 0 : getItemPrice(state, item);
        const requiredLevel = dish?.unlockLevel ?? wallpaper?.level ?? floor?.level ?? door?.level ?? skin?.level ?? painting?.level ?? windowItem?.level ?? loyalty?.level ?? (item.upgrade ? UPGRADE_LEVELS[item.upgrade] : 1);
        const active = floorActive || wallpaperActive || doorActive || skinActive;
        const status = wallpaperActive ? 'Выбрано' : floorActive || doorActive ? 'Активен' : loyaltyOwned ? 'Куплено' : maxed ? 'Максимум' : locked ? `Нужен ${requiredLevel} уровень`
          : paintingOwned ? 'Разместить' : skinOwned ? 'Выбрать применение' : floorOwned || doorOwned ? 'Применить бесплатно' : `${priceValue} монет`;
        button.setAttribute('aria-label', `${item.label} — ${status}`); button.disabled = locked || maxed || (active && !skinActive) || state.coins < priceValue;
        button.classList.toggle('is-locked', locked); button.classList.toggle('is-active', active || loyaltyOwned); setIcon(elements, item, false); label.textContent = item.label;
        const stockCount = item.furniture ? state.furnitureInventory[item.furniture] ?? 0 : 0;
        const stock = item.furniture ? `На складе: ${stockCount}` : '';
        elements.stock.hidden = stockCount <= 0;
        elements.stock.textContent = stockCount > 0 ? String(stockCount) : '';
        meta.hidden = false;
        meta.textContent = item.upgrade ? `${state.upgrades[item.upgrade]}/${MAX_UPGRADE_LEVEL}${maxed ? ' · Максимум' : ''}`
          : dish ? `Уровень ${dish.unlockLevel} · Блюдо ${dish.price} монет`
            : wallpaper ? `Уровень ${wallpaper.level} · ${wallpaper.price} монет за клетку 1×1`
              : door ? `Уровень ${door.level} · ${door.description}${doorOwned ? ' · Куплена' : ''}`
                : floor ? `Уровень ${floor.level} · Весь ресторан${floorOwned ? ' · Куплен' : ''}`
                  : skin ? `Уровень ${skin.level}`
                    : painting ? `Уровень ${painting.level} · ${painting.widthCells}×${painting.heightCells} · +${Math.max(1, Math.round(painting.price / 500))} к рейтингу`
                      : loyalty ? `Уровень ${loyalty.level} · +${loyalty.bonus}% к терпению · навсегда`
                        : item.id === 'limit' ? `Уровень: ${levelGuestLimit(state.level)} · Куплено: ${state.purchasedGuestSlots}/${MAX_PURCHASED_SLOTS}`
                          : item.id === 'waiter' ? `Нанято: ${waiters}/${MAX_WAITERS}` : stock;
        price.textContent = status;
      }
      refreshPagination();
    },
    setVisible(visible: boolean) { root.hidden = !visible; if (!visible) closePanel(); },
    open() { currentPage = 1; refreshPagination(); root.classList.add('is-open'); }, close: closePanel,
  };
}
