import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { ICON_NAMES } from '../src/ui/icons';
import { canAfford, getItemPrice, isLocked, SHOP_CATEGORIES, SHOP_ITEMS } from '../src/ui/shopPanel';

describe('модель панели магазина', () => {
  it('содержит всю мебель и проверяет доступность по балансу', () => {
    expect(SHOP_ITEMS.find((item) => item.id === 'table')).toMatchObject({ label: 'Одиночный стол', price: 100 });
    expect(SHOP_ITEMS.find((item) => item.id === 'tableDouble')).toMatchObject({ label: 'Двойной стол', price: 200 });
    expect(SHOP_ITEMS.find((item) => item.id === 'chair')).toMatchObject({ label: 'Стул', price: 75 });
    expect(canAfford(createGame(), SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(true);
    expect(canAfford({ ...createGame(), coins: 99 }, SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(false);
  });

  it('группирует покупки по шести направлениям с наглядными SVG-иконками', () => {
    expect(SHOP_CATEGORIES.map((category) => category.id)).toEqual(['kitchen', 'hall', 'staff', 'recipes', 'decorations', 'loyalty']);
    expect([...SHOP_CATEGORIES, ...SHOP_ITEMS].every((item) => ICON_NAMES.includes(item.icon))).toBe(true);
    const equipment = SHOP_ITEMS.filter((item) => !item.dishId && !item.wallpaperId && !item.floorId && !item.doorId && !item.furnitureSkinId && !item.paintingId && !item.windowId && !item.loyaltyId);
    const recipes = SHOP_ITEMS.filter((item) => item.dishId);
    const wallpapers = SHOP_ITEMS.filter((item) => item.wallpaperId);
    const floors = SHOP_ITEMS.filter((item) => item.floorId);
    const doors = SHOP_ITEMS.filter((item) => item.doorId);
    expect(new Set(equipment.map((item) => item.icon)).size).toBe(equipment.length);
    expect(new Set(recipes.map((item) => item.dishId)).size).toBe(32);
    expect(new Set(wallpapers.map((item) => item.wallpaperId)).size).toBe(5);
    expect(new Set(floors.map((item) => item.floorId)).size).toBe(5);
    expect(new Set(doors.map((item) => item.doorId)).size).toBe(5);
    expect(SHOP_ITEMS.filter((item) => item.furnitureSkinId)).toHaveLength(36);
    expect(SHOP_ITEMS.filter((item) => item.paintingId)).toHaveLength(5);
    expect(SHOP_ITEMS.filter((item) => item.windowId)).toHaveLength(5);
    expect(SHOP_ITEMS.filter((item) => item.loyaltyId)).toHaveLength(10);
    expect(SHOP_ITEMS.some((item) => item.furniture === 'plant')).toBe(false);
    for (const category of SHOP_CATEGORIES) {
      expect(SHOP_ITEMS.some((item) => item.category === category.id)).toBe(true);
    }
  });

  it('показывает динамические цены и блокировки улучшений', () => {
    const state = createGame();
    const cooking = SHOP_ITEMS.find((item) => item.id === 'cookingUpgrade')!;
    const waiter = SHOP_ITEMS.find((item) => item.id === 'waiterUpgrade')!;
    expect(isLocked(state, cooking)).toBe(true);
    expect(getItemPrice(state, cooking)).toBe(300);
    state.level = 3;
    state.upgrades.cooking = 1;
    state.upgrades.waiter = 1;
    expect(isLocked(state, cooking)).toBe(false);
    expect(getItemPrice(state, cooking)).toBe(390);
    expect(getItemPrice(state, waiter)).toBe(675);
  });

  it('разблокирует второго повара и плиту на 15, третьих — на 25 уровне', () => {
    const state = createGame();
    const chef = SHOP_ITEMS.find((item) => item.id === 'chef')!;
    const stove = SHOP_ITEMS.find((item) => item.id === 'stove')!;
    expect(chef.category).toBe('staff');
    expect(stove.category).toBe('kitchen');
    expect(isLocked(state, chef)).toBe(true);
    expect(isLocked(state, stove)).toBe(true);
    expect(getItemPrice(state, chef)).toBe(15_000);
    expect(getItemPrice(state, stove)).toBe(20_000);
    state.level = 15;
    expect(isLocked(state, chef)).toBe(false);
    expect(isLocked(state, stove)).toBe(false);
    state.furniture.push({ id: 'stove-2', kind: 'stove', position: { x: 3, y: 1 }, rotation: 0 });
    state.employees.push({ id: 'chef-2', role: 'chef', position: { x: 3, y: 2 }, energy: 100, stoveId: 'stove-2' });
    expect(isLocked(state, chef)).toBe(true);
    expect(isLocked(state, stove)).toBe(true);
    expect(getItemPrice(state, chef)).toBe(35_000);
    expect(getItemPrice(state, stove)).toBe(50_000);
    state.level = 25;
    expect(isLocked(state, chef)).toBe(false);
    expect(isLocked(state, stove)).toBe(false);
  });
});
