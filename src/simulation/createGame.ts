import type { GameState } from './types';

export function createGame(): GameState {
  return {
    version: 2,
    peakState: { activePeakId: null, rewardedPeakIds: [], current: null, last: null },
    questBaseline: { servedTotal: 0, revenueTotal: 0, coins: 0, dishes: 0, skins: 0,
      wallpapers: 0, floors: 0, paintings: 0, windows: 0,
      waiters: 0, counters: 0, plants: 0, upgradeCooking: 0, upgradeWaiter: 0, },
    completedSideQuestIds: [],
    dailyQuestState: { date: '', id: '', progress: 0, rewarded: false },
    peakQuestTotals: { servedTotal: 0, perfectPeaksTotal: 0, },
    coins: 1_000, experience: 0, level: 1, completedQuestIds: [], unlockedDishIds: ['soup'],
    servedTotal: 0, revenueTotal: 0, satisfiedStreak: 0, desiredServedTotal: 0, unhappyTotal: 0,
    guestQueue: [], queueRejectedTotal: 0, queueTimeoutTotal: 0, queueSeatedTotal: 0, queueWaitTicksTotal: 0,
    paidExpansions: 0, purchasedGuestSlots: 0, upgrades: { cooking: 0, waiter: 0 }, lastDailyReward: '',
    calendar: { lastClaimDate: '', nextDayIndex: 0, cycle: 1 },
    popularity: 100, ratingHistory: [{ tick: 0, value: 100 }], tick: 0, arrivalProgress: 0, width: 8, height: 8,
    randomSeed: 123456789, guestLimit: 7, maxGuestLimit: 7, furnitureInventory: {},
    ownedWallpapers: {}, appliedWallpapers: [],
    activeFloorPattern: null, ownedFloorPatterns: [], activeWallpaperId: null,
    ownedDoorPatterns: [], activeDoorPattern: null,
    ownedFurnitureSkins: [], firstPurchaseApplied: [], appliedFurnitureSkins: [], appliedStoveSkins: [], appliedCounterSkins: [],
    appliedChefSkins: [], appliedWaiterSkins: [], ownedPaintings: [], appliedPaintings: [], ownedWindows: [], appliedWindows: [],
    ownedLoyaltyItems: [], toleranceBonus: 0, decorationRatingBonus: 0,
    employees: [
      { id: 'chef-1', role: 'chef', position: { x: 2, y: 2 }, energy: 100, stoveId: 'stove-1' },
    ],
    furniture: [
      { id: 'door-1', kind: 'door', position: { x: 0, y: 7 }, rotation: 0 },
      { id: 'stove-1', kind: 'stove', position: { x: 1, y: 1 }, rotation: 0 },
      { id: 'table-1', kind: 'table', position: { x: 5, y: 4 }, rotation: 0 },
      { id: 'chair-1', kind: 'chair', position: { x: 5, y: 5 }, rotation: 0 },
    ],
    customers: [], orders: [],
  };
}
