export type Role = 'chef' | 'waiter';
export type FurnitureKind = 'door' | 'stove' | 'table' | 'tableDouble' | 'chair' | 'plant' | 'counter';
export interface Point { x: number; y: number }
export interface Employee { id: string; role: Role; position: Point; energy: number; target?: Point; taskId?: string; movementCredit?: number }
export interface Furniture { id: string; kind: FurnitureKind; position: Point; rotation: 0 | 90 | 180 | 270 }
export type CustomerState = 'entering' | 'waiting' | 'seekingSeat' | 'wandering' | 'inspecting' | 'seated' | 'ordering' | 'waitingFood' | 'eating' | 'leaving';
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
}
export interface Order { id: string; customerId: string; state: 'waitingCook' | 'cooking' | 'waitingDelivery' | 'delivered'; progress: number; dishId?: string; desired?: boolean; assignedTo?: string; pickedUp?: boolean }
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
export interface GameState {
  version: 1;
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
  paidExpansions: number;
  purchasedGuestSlots: number;
  upgrades: { cooking: number; waiter: number };
  lastDailyReward: string;
  calendar: CalendarState;
  popularity: number;
  tick: number;
  spawnProgress: number;
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
