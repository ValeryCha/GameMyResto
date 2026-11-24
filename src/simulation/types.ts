export type Role = 'chef' | 'waiter';
export type FurnitureKind = 'door' | 'stove' | 'table' | 'tableDouble' | 'chair' | 'plant' | 'counter';
export interface Point { x: number; y: number }
export interface Employee { id: string; role: Role; position: Point; energy: number; target?: Point; taskId?: string; movementCredit?: number; stoveId?: string; orderIds?: string[]; }
export interface Furniture { id: string; kind: FurnitureKind; position: Point; rotation: 0 | 90 | 180 | 270 }
export type CustomerState = 'entering' | 'waiting' | 'queueWaiting' | 'seekingSeat' | 'wandering' | 'inspecting' | 'seated' | 'ordering' | 'waitingFood' | 'eating' | 'leaving';
export type HairStyle = 'short' | 'long' | 'bun' | 'ponytail' | 'curly';
export interface CustomerAppearance {
  bodyType: 'masculine' | 'feminine';
  hairStyle: HairStyle;
  hairColor: number;
  skinColor: number;
  outfitColor: number;
}
export interface Customer extends Partial<CustomerAppearance> {
  id: string; position: Point; state: CustomerState; patience: number; target?: Point; orderId?: string; seatId?: string; actionUntil?: number; foodWait?: number;
  hasDesire?: boolean; desiredDishId?: string; waitingForRecipe?: boolean;
  queueEnteredAt?: number; queueWaitedTicks?: number; queuePatience?: number;
}
export interface Order { id: string; customerId: string; state: 'waitingWaiter' | 'takingOrder' | 'waitingCook' | 'cooking' | 'waitingDelivery' | 'delivered'; progress: number; dishId?: string; desired?: boolean; stoveId?: string; chefId?: string; deliveryProgress?: number; counterId?: string; assignedTo?: string; pickedUp?: boolean; stateChangedAt?: number }
export interface CalendarState {
  lastClaimDate: string;
  nextDayIndex: number;
  cycle: number;
}
export interface AppliedWallpaper {
  wallCellId: string;
  wallpaperId: string;
}
export type FurnitureSkinKind = 'table' | 'tableDouble' | 'chair' | 'stove' | 'counter' | 'chef' | 'waiter';
export interface FurnitureSkinAssignment { furnitureId: string; skinId: string }
export interface ActorSkinAssignment { employeeId: string; skinId: string }
export interface AppliedPainting {
  id: string;
  paintingId: string;
  side: 'north' | 'south' | 'west' | 'east';
  index: number;
}
export interface AppliedWindow {
  id: string;
  windowId: string;
  side: 'north' | 'south' | 'west' | 'east';
  index: number;
}
export interface PeakStats {
  startedAtTick: number;
  arrived: number;
  seated: number;
  served: number;
  unhappy: number;
  queueRejected: number;
  queueTimeout: number;
  revenue: number;
  bonusCoins: number;
  carriedIn: number;
}
export interface PeakResult extends PeakStats {
  peakId: number;
  serviceRatio: number;
  completion: number;
  bonusXP: number;
  perfect: boolean;
}
export interface GameState {
  version: number;
  peakState: {
    activePeakId: number | null;
    rewardedPeakIds: number[];
    current: PeakStats | null;
    last: PeakResult | null;
  };

  questBaseline: {
    servedTotal: number;
    revenueTotal: number;
    coins: number;
    dishes: number;
    skins: number;
    wallpapers: number;
    floors: number;
    paintings: number;
    windows: number;
    waiters: number;
    counters: number;
    plants: number;
    upgradeCooking: number;
    upgradeWaiter: number;
  };
  completedSideQuestIds: string[];
  dailyQuestState: {
    date: string;
    id: string;
    progress: number;
    rewarded: boolean;
  };
  peakQuestTotals: {
    servedTotal: number;
    perfectPeaksTotal: number;
  };

  coins: number;
  experience: number;
  level: number;
  completedQuestIds: string[];
  unlockedDishIds: string[];
  servedTotal: number;
  revenueTotal: number;
  satisfiedStreak: number;
  desiredServedTotal: number;
  unhappyTotal: number;
  guestQueue: string[];
  queueRejectedTotal: number;
  queueTimeoutTotal: number;
  queueSeatedTotal: number;
  queueWaitTicksTotal: number;
  paidExpansions: number;
  purchasedGuestSlots: number;
  upgrades: { cooking: number; waiter: number };
  lastDailyReward: string;
  calendar: CalendarState;
  /** Рейтинг ресторана в диапазоне 0–1000. */
  popularity: number;
  /** Транзиентная история для тренда HUD; в сохранение не входит. */
  ratingHistory: { tick: number; value: number }[];
  /** Глобальная пауза симуляции на время редактора; в сохранение не входит. */
  editorMode?: boolean;
  tick: number;
  arrivalProgress: number;
  width: number;
  height: number;
  randomSeed: number;
  guestLimit: number;
  maxGuestLimit: number;
  furnitureInventory: Partial<Record<FurnitureKind, number>>;
  ownedWallpapers: Record<string, number>;
  appliedWallpapers: AppliedWallpaper[];
  activeFloorPattern: string | null;
  ownedFloorPatterns: string[];
  activeWallpaperId: string | null;
  wallpaperExpansionNormalized?: boolean;
  ownedDoorPatterns: string[];
  activeDoorPattern: string | null;
  ownedFurnitureSkins: string[];
  firstPurchaseApplied: string[];
  appliedFurnitureSkins: FurnitureSkinAssignment[];
  appliedStoveSkins: FurnitureSkinAssignment[];
  appliedCounterSkins: FurnitureSkinAssignment[];
  appliedChefSkins: ActorSkinAssignment[];
  appliedWaiterSkins: ActorSkinAssignment[];
  ownedPaintings: string[];
  appliedPaintings: AppliedPainting[];
  ownedWindows: string[];
  appliedWindows: AppliedWindow[];
  ownedLoyaltyItems: string[];
  toleranceBonus: number;
  decorationRatingBonus: number;
  employees: Employee[];
  furniture: Furniture[];
  customers: Customer[];
  orders: Order[];
}
export interface CommandResult { ok: boolean; reason?: string }
