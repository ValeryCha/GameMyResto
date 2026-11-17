import { describe, expect, it } from 'vitest';
import { FURNITURE_SKINS } from '../src/content/furnitureSkins';
import { LOYALTY_ITEMS } from '../src/content/loyalty';
import { PAINTINGS } from '../src/content/paintings';
import { normalizeState } from '../src/persistence/normalizeState';
import { applyFurnitureSkin, buyFurnitureSkin, buyLoyaltyItem, buyPainting, loyaltyBonus, movePainting, paintingWallCells, placePainting, removePainting } from '../src/simulation/catalogDecorations';
import { createGame } from '../src/simulation/createGame';
import { advanceSimulation, patienceBonus } from '../src/simulation/tick';

function richGame() {
  const state = createGame(); state.level = 30; state.coins = 1_000_000; return state;
}

describe('скины мебели и персонала', () => {
  it('содержит пять скинов для каждого из семи типов', () => {
    for (const kind of ['table', 'tableDouble', 'chair', 'stove', 'counter', 'chef', 'waiter'] as const) {
      expect(FURNITURE_SKINS.filter((skin) => skin.kind === kind)).toHaveLength(5);
    }
    expect(FURNITURE_SKINS).toHaveLength(35);
  });

  it('назначает разные скины отдельным столам и взимает полную цену повторно', () => {
    const state = richGame();
    state.furniture.push({ id: 'table-2', kind: 'table', position: { x: 5, y: 5 }, rotation: 0 });
    const [first, second] = state.furniture.filter((item) => item.kind === 'table');
    expect(buyFurnitureSkin(state, 'oakTable')).toEqual({ ok: true });
    expect(state.coins).toBe(999_900);
    expect(applyFurnitureSkin(state, 'oakTable', first.id)).toEqual({ ok: true });
    expect(state.appliedFurnitureSkins).toEqual([{ furnitureId: first.id, skinId: 'oakTable' }]);
    buyFurnitureSkin(state, 'royalTable');
    applyFurnitureSkin(state, 'royalTable', second.id);
    expect(state.appliedFurnitureSkins).toEqual([
      { furnitureId: first.id, skinId: 'oakTable' }, { furnitureId: second.id, skinId: 'royalTable' },
    ]);
    const rating = state.popularity; const coins = state.coins;
    buyFurnitureSkin(state, 'oakTable'); applyFurnitureSkin(state, 'oakTable', first.id);
    expect(state.coins).toBe(coins - 100); expect(state.popularity).toBe(rating);
    normalizeState(state);
    expect(state.appliedFurnitureSkins).toHaveLength(2);
  });

  it('применяет ко всем только существующие объекты и не списывает монеты без целей', () => {
    const state = createGame();
    expect(buyFurnitureSkin(state, 'walnutTable').ok).toBe(false);
    expect(buyFurnitureSkin(state, 'oakTable').ok).toBe(true);
    expect(applyFurnitureSkin(state, 'oakTable').ok).toBe(true);
    expect(state.appliedFurnitureSkins).toHaveLength(1);
    const oldId = state.appliedFurnitureSkins[0].furnitureId;
    state.furniture.push({ id: 'future-table', kind: 'table', position: { x: 5, y: 5 }, rotation: 0 });
    expect(state.appliedFurnitureSkins).toEqual([{ furnitureId: oldId, skinId: 'oakTable' }]);
    state.furniture = state.furniture.filter((item) => item.kind !== 'table');
    const coins = state.coins;
    expect(buyFurnitureSkin(state, 'oakTable').ok).toBe(false);
    expect(state.coins).toBe(coins);
    expect(applyFurnitureSkin(state, 'oakTable').ok).toBe(false);
  });

  it('назначает разные скины двум официантам и отдельные скины оборудованию', () => {
    const state = richGame();
    state.employees.push(
      { id: 'waiter-1', role: 'waiter', position: { x: 1, y: 2 }, energy: 100 },
      { id: 'waiter-2', role: 'waiter', position: { x: 2, y: 2 }, energy: 100 },
    );
    buyFurnitureSkin(state, 'classicWaiter'); buyFurnitureSkin(state, 'retroWaiter');
    applyFurnitureSkin(state, 'classicWaiter', 'waiter-1'); applyFurnitureSkin(state, 'retroWaiter', 'waiter-2');
    expect(state.appliedWaiterSkins).toEqual([
      { employeeId: 'waiter-1', skinId: 'classicWaiter' }, { employeeId: 'waiter-2', skinId: 'retroWaiter' },
    ]);
    state.furniture.push({ id: 'counter-test', kind: 'counter', position: { x: 3, y: 3 }, rotation: 0 });
    buyFurnitureSkin(state, 'gasStove'); buyFurnitureSkin(state, 'woodCounter');
    expect(applyFurnitureSkin(state, 'gasStove').ok).toBe(true);
    expect(applyFurnitureSkin(state, 'woodCounter').ok).toBe(true);
    expect(state.appliedStoveSkins[0].skinId).toBe('gasStove');
    expect(state.appliedCounterSkins[0].skinId).toBe('woodCounter');
    normalizeState(state);
    expect(state.appliedWaiterSkins).toHaveLength(2);
  });
});

describe('картины', () => {
  it('содержит пять картин с заданными размерами и ценами', () => {
    expect(PAINTINGS.map(({ price, widthCells, heightCells }) => ({ price, widthCells, heightCells }))).toEqual([
      { price: 300, widthCells: 1, heightCells: 1 }, { price: 800, widthCells: 1, heightCells: 2 },
      { price: 1500, widthCells: 2, heightCells: 1 }, { price: 3000, widthCells: 2, heightCells: 2 },
      { price: 6000, widthCells: 2, heightCells: 2 },
    ]);
  });

  it('занимает выбранные клетки и запрещает пересечения, дверь и низкие стены', () => {
    const state = richGame();
    buyPainting(state, 'hills'); buyPainting(state, 'city'); buyPainting(state, 'fruit');
    expect(paintingWallCells(PAINTINGS[2], { side: 'north', index: 0 }, state.width, state.height)).toEqual(['north-0', 'north-1']);
    expect(placePainting(state, 'hills', 'north', 0).ok).toBe(true);
    expect(placePainting(state, 'city', 'north', 0).ok).toBe(false);
    expect(placePainting(state, 'fruit', 'south', 2).ok).toBe(false);
    const door = state.furniture.find((item) => item.kind === 'door')!;
    expect(placePainting(state, 'hills', 'north', door.position.x).ok).toBe(false);
    expect(placePainting(state, 'city', 'north', 1).ok).toBe(true);
    normalizeState(state);
    expect(state.appliedPaintings).toHaveLength(2);
  });

  it('перемещает картину без повторной покупки и проверяет коллизии на новом месте', () => {
    const state = richGame();
    buyPainting(state, 'hills'); buyPainting(state, 'city');
    placePainting(state, 'hills', 'north', 0); placePainting(state, 'city', 'north', 2);
    const id = state.appliedPaintings[0].id; const coins = state.coins;
    expect(movePainting(state, id, 'north', 2).ok).toBe(false);
    expect(movePainting(state, id, 'north', 8).ok).toBe(false);
    expect(movePainting(state, id, 'west', 3).ok).toBe(true);
    expect(state.appliedPaintings[0]).toMatchObject({ id, side: 'west', index: 3 });
    expect(state.coins).toBe(coins);
  });

  it('продаёт каждый экземпляр картины и возвращает 50% при удалении', () => {
    const state = createGame();
    expect(buyPainting(state, 'hills').ok).toBe(true);
    expect(state.coins).toBe(700);
    expect(buyPainting(state, 'hills').ok).toBe(true);
    expect(state.coins).toBe(400);
    placePainting(state, 'hills', 'north', 0);
    const id = state.appliedPaintings[0].id;
    const rating = state.decorationRatingBonus;
    expect(removePainting(state, id).ok).toBe(true);
    expect(state.coins).toBe(550);
    expect(state.ownedPaintings).toEqual(['hills', 'hills']);
    expect(state.decorationRatingBonus).toBe(rating - 1);
  });
});

describe('лояльность', () => {
  it('содержит десять покупок с растущими ценами и бонусами', () => {
    expect(LOYALTY_ITEMS).toHaveLength(10);
    for (let index = 1; index < LOYALTY_ITEMS.length; index += 1) {
      expect(LOYALTY_ITEMS[index].price).toBeGreaterThan(LOYALTY_ITEMS[index - 1].price);
      expect(LOYALTY_ITEMS[index].bonus).toBeGreaterThan(LOYALTY_ITEMS[index - 1].bonus);
    }
  });

  it('покупается один раз и ограничивает суммарный бонус 100%', () => {
    const state = richGame();
    for (const item of LOYALTY_ITEMS) expect(buyLoyaltyItem(state, item.id).ok).toBe(true);
    expect(loyaltyBonus(state)).toBe(100);
    expect(state.toleranceBonus).toBe(100);
    const coins = state.coins;
    expect(buyLoyaltyItem(state, 'welcomeMint').ok).toBe(false);
    expect(state.coins).toBe(coins);
  });

  it('реально увеличивает терпение и ожидание еды', () => {
    const state = createGame();
    buyLoyaltyItem(state, 'welcomeMint');
    advanceSimulation(state, 1);
    expect(state.customers[0].patience).toBeCloseTo(240 * 1.05 * 0.88 - 1);
    state.customers[0].state = 'ordering';
    state.customers[0].seatId = 'chair-1';
    advanceSimulation(state, 1);
    expect(state.customers[0].foodWait).toBeCloseTo(120 * 1.05 * 0.88);
  });

  it('мигрирует старое растение без повторного бонуса', () => {
    const state = createGame();
    state.furniture.push({ id: 'legacy-plant', kind: 'plant', position: { x: 2, y: 2 }, rotation: 0 });
    normalizeState(state);
    expect(state.ownedLoyaltyItems).toContain('plant');
    expect(state.toleranceBonus).toBe(10);
    expect(patienceBonus(state)).toBe(0.1);
  });
});
