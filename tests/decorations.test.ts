import { describe, expect, it } from 'vitest';
import { WALLPAPERS } from '../src/content/wallpapers';
import { FLOOR_PATTERNS } from '../src/content/floors';
import { DOOR_PATTERNS } from '../src/content/doors';
import { applyWallpaper, buyOrApplyDoor, buyOrApplyFloor, buyOrApplyWallpaper, buyWallpaper, isStaticWallCell, isWallCell, removeDoorPattern, removeFloor, removeWallpaper } from '../src/simulation/decorations';
import { createGame } from '../src/simulation/createGame';
import { normalizeState } from '../src/persistence/normalizeState';
import { decorationRating } from '../src/simulation/rating';

function richGame(level = 25) {
  const state = createGame(); state.level = level; state.coins = 100_000; return state;
}

describe('глобальные декорации', () => {
  it('содержит по пять обоев, полов и дверей с заданными ценами', () => {
    expect(WALLPAPERS.map(({ level, price }) => ({ level, price }))).toEqual([
      { level: 1, price: 150 }, { level: 5, price: 400 }, { level: 10, price: 1200 }, { level: 18, price: 3500 }, { level: 25, price: 8000 },
    ]);
    expect(FLOOR_PATTERNS.map(({ level, price }) => ({ level, price }))).toEqual([
      { level: 1, price: 200 }, { level: 5, price: 600 }, { level: 10, price: 1500 }, { level: 18, price: 4000 }, { level: 25, price: 10000 },
    ]);
    expect(DOOR_PATTERNS.map(({ level, price }) => ({ level, price }))).toEqual([
      { level: 1, price: 300 }, { level: 5, price: 900 }, { level: 10, price: 2200 }, { level: 18, price: 4500 }, { level: 25, price: 8000 },
    ]);
  });

  it('только выбирает узор до клика и списывает монеты за каждую клетку', () => {
    const state = createGame();
    expect(buyWallpaper(state, 'warmBrick')).toEqual({ ok: false, reason: 'Нужен 5 уровень' });
    expect(buyOrApplyWallpaper(state, 'creamStripes')).toEqual({ ok: true });
    expect(state.coins).toBe(1000);
    expect(state.ownedWallpapers.creamStripes).toBeUndefined();
    expect(state.activeWallpaperId).toBe('creamStripes');
    expect(applyWallpaper(state, 'north-0', 'creamStripes').ok).toBe(true);
    expect(applyWallpaper(state, 'north-1', 'creamStripes').ok).toBe(true);
    expect(state.coins).toBe(700);
    expect(state.ownedWallpapers.creamStripes).toBe(2);
    expect(state.appliedWallpapers).toHaveLength(2);
    state.coins = 149;
    expect(applyWallpaper(state, 'north-2', 'creamStripes')).toEqual({ ok: false, reason: 'Недостаточно монет' });
  });

  it('заменяет узор, учитывает рейтинг и разрешает декор на всех текущих стенах', () => {
    const state = richGame();
    expect(isWallCell('north-1', state.width, state.height)).toBe(true);
    expect(isStaticWallCell('north-8', state.width, state.height)).toBe(false);
    applyWallpaper(state, 'north-0', 'creamStripes');
    const rated = state.popularity;
    applyWallpaper(state, 'north-0', 'goldenHoliday');
    expect(state.activeWallpaperId).toBe('goldenHoliday');
    expect(state.decorationRatingBonus).toBe(decorationRating(8000));
    expect(state.popularity).toBe(rated - decorationRating(150) + decorationRating(8000));
    state.width = 12; state.height = 12; normalizeState(state);
    expect(isStaticWallCell('north-8', state.width, state.height)).toBe(true);
    const coins = state.coins;
    expect(applyWallpaper(state, 'north-8', 'creamStripes').ok).toBe(true);
    expect(state.coins).toBe(coins - 150);
    normalizeState(state);
    expect(state.appliedWallpapers).toHaveLength(17);
    expect(state.appliedWallpapers).toContainEqual({ wallCellId: 'north-0', wallpaperId: 'goldenHoliday' });
    expect(state.appliedWallpapers).toContainEqual({ wallCellId: 'north-8', wallpaperId: 'creamStripes' });
    expect(state.appliedWallpapers.filter((item) => ['north-9', 'north-10', 'north-11'].includes(item.wallCellId)).every((item) => item.wallpaperId === 'goldenHoliday')).toBe(true);
  });

  it('мигрирует старые сегменты и выбирает активный узор', () => {
    const legacy = createGame() as Partial<ReturnType<typeof createGame>>;
    delete legacy.ownedWallpapers; delete legacy.appliedWallpapers; delete legacy.activeWallpaperId;
    delete legacy.ownedDoorPatterns; delete legacy.activeDoorPattern;
    const normalized = normalizeState(legacy as ReturnType<typeof createGame>);
    expect(normalized.ownedWallpapers).toEqual({});
    expect(normalized.activeWallpaperId).toBeNull();
    expect(normalized.ownedDoorPatterns).toEqual([]);
    normalized.appliedWallpapers = [
      { wallSegmentId: 'north-0', wallpaperId: 'creamStripes' },
      { wallSegmentId: 'north-0', wallpaperId: 'warmBrick' },
      { wallSegmentId: 'bad-0', wallpaperId: 'creamStripes' },
    ] as unknown as typeof normalized.appliedWallpapers;
    normalizeState(normalized);
    expect(normalized.appliedWallpapers).toEqual([
      { wallCellId: 'north-0', wallpaperId: 'warmBrick' }, { wallCellId: 'north-1', wallpaperId: 'warmBrick' },
    ]);
    expect(normalized.activeWallpaperId).toBe('warmBrick');
    expect(normalized.ownedWallpapers.warmBrick).toBe(1);
    normalizeState(normalized);
    expect(normalized.appliedWallpapers).toHaveLength(2);
  });

  it('пол покупается один раз, остаётся при расширении и бесплатно сбрасывается', () => {
    const state = createGame();
    buyOrApplyFloor(state, 'simpleTile');
    expect(state.coins).toBe(800);
    state.width = 12; state.height = 10; normalizeState(state);
    expect(state.activeFloorPattern).toBe('simpleTile');
    buyOrApplyFloor(state, 'simpleTile');
    expect(state.coins).toBe(800);
    expect(removeFloor(state)).toEqual({ ok: true });
    expect(state.coins).toBe(800);
    expect(state.activeFloorPattern).toBeNull();
    expect(state.ownedFloorPatterns).toEqual(['simpleTile']);
    expect(state.decorationRatingBonus).toBe(0);
  });

  it('дверь заменяется бесплатно после покупки и бесплатно сбрасывается', () => {
    const state = richGame();
    buyOrApplyDoor(state, 'oak');
    expect(state.activeDoorPattern).toBe('oak');
    expect(state.decorationRatingBonus).toBe(decorationRating(300));
    buyOrApplyDoor(state, 'carved');
    expect(state.activeDoorPattern).toBe('carved');
    expect(state.decorationRatingBonus).toBe(decorationRating(8000));
    const coins = state.coins;
    buyOrApplyDoor(state, 'oak');
    expect(state.coins).toBe(coins);
    expect(removeDoorPattern(state)).toEqual({ ok: true });
    expect(state.coins).toBe(coins);
    expect(state.activeDoorPattern).toBeNull();
    expect(state.ownedDoorPatterns).toEqual(['oak', 'carved']);
  });

  it('снимает обои только по одной клетке и бесплатно', () => {
    const state = createGame();
    applyWallpaper(state, 'north-0', 'creamStripes');
    applyWallpaper(state, 'north-1', 'creamStripes');
    expect(removeWallpaper(state, 'north-0')).toEqual({ ok: true });
    expect(state.coins).toBe(700);
    expect(state.appliedWallpapers.map((item) => item.wallCellId)).toEqual(['north-1']);
    expect(removeWallpaper(state, 'north-0').ok).toBe(false);
    expect(state.appliedWallpapers).toHaveLength(1);
  });

  it('мигрирует глобальный узор и бесплатно продолжает его на новых стенах старого сейва', () => {
    const state = richGame();
    state.width = 12; state.height = 12;
    state.appliedWallpapers = []; state.activeWallpaperId = 'goldenHoliday';
    normalizeState(state);
    expect(state.appliedWallpapers).toHaveLength(48);
    expect(state.appliedWallpapers.filter((item) => Number(item.wallCellId.split('-')[1]) >= 8)).toHaveLength(16);
    expect(state.appliedWallpapers.every((item) => item.wallpaperId === 'goldenHoliday')).toBe(true);
  });
});
