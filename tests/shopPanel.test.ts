import { describe, expect, it } from 'vitest';
import { createGame } from '../src/simulation/createGame';
import { canAfford, SHOP_ITEMS } from '../src/ui/shopPanel';

describe('модель панели магазина', () => {
  it('содержит все три вида мебели и проверяет доступность по балансу', () => {
    expect(SHOP_ITEMS.find((item) => item.id === 'table')).toMatchObject({ label: 'Стол 1×1', price: 100 });
    expect(SHOP_ITEMS.find((item) => item.id === 'tableDouble')).toMatchObject({ label: 'Стол 2×1', price: 200 });
    expect(SHOP_ITEMS.find((item) => item.id === 'chair')).toMatchObject({ label: 'Стул', price: 75 });
    expect(canAfford(createGame(), SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(true);
    expect(canAfford({ ...createGame(), coins: 99 }, SHOP_ITEMS.find((item) => item.id === 'table')!)).toBe(false);
  });
});
