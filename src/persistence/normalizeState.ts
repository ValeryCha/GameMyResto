import { STARTER_QUEST_IDS } from '../content/quests';
import { floorPatternById } from '../content/floors';
import { doorPatternById } from '../content/doors';
import type { ActorSkinAssignment, AppliedWallpaper, FurnitureSkinAssignment, GameState } from '../simulation/types';
import { processProgression } from '../simulation/progression';
import { recalculateGuestLimit } from '../simulation/guestLimits';
import { appearanceForId } from '../render3d/appearance';
import { wallpaperById } from '../content/wallpapers';
import { isStaticWallCell, isWallCell } from '../simulation/decorations';
import { calculateDecorationRating } from '../simulation/rating';
import { furnitureSkinById } from '../content/furnitureSkins';
import { loyaltyItemById } from '../content/loyalty';
import { windowById } from '../content/windows';
import { paintingById } from '../content/paintings';
import { windowWallCells } from '../simulation/wallWindows';
import { loyaltyBonus, paintingWallCells } from '../simulation/catalogDecorations';
import { inheritExpandedWallpapers } from '../simulation/expansion';
import { normalizePeakState } from '../simulation/peak';
import { normalizeQueueState } from '../simulation/queue';
import { ensureOrderCounter } from '../simulation/counterService';
import { synchronizeChefStoves } from '../simulation/kitchen';

const CURRENT_STATE_VERSION = 2;
function captureQuestBaseline(state: GameState): GameState['questBaseline'] {
  return {
    servedTotal: state.servedTotal ?? 0,
    revenueTotal: state.revenueTotal ?? 0,
    coins: state.coins ?? 0,
    dishes: (state.unlockedDishIds ?? []).length,
    skins: (state.ownedFurnitureSkins ?? []).length,
    wallpapers: Object.keys(state.ownedWallpapers ?? {}).length,
    floors: (state.ownedFloorPatterns ?? []).length,
    paintings: (state.appliedPaintings ?? []).length,
    windows: (state.appliedWindows ?? []).length,
    waiters: state.employees.filter((e) => e.role === 'waiter').length,
    counters: state.furniture.filter((f) => f.kind === 'counter').length,
    plants: state.furniture.filter((f) => f.kind === 'plant').length,
    upgradeCooking: state.upgrades?.cooking ?? 0,
    upgradeWaiter: state.upgrades?.waiter ?? 0,
  };
}
export function normalizeState(state: GameState): GameState {
  // Загрузка всегда начинается в игровом режиме, даже для старых/внешних сейвов.
  delete state.editorMode;
  if ((state.version ?? 1) < CURRENT_STATE_VERSION) {
    state.popularity = (state.popularity ?? 50) * 10;
    state.arrivalProgress = 0;
    state.version = CURRENT_STATE_VERSION;
  }
  state.popularity = Math.max(0, Math.min(1000, Number.isFinite(state.popularity) ? state.popularity : 500));
  // История не приходит из сейва: прошлый тренд после загрузки не выдумывается.
  state.ratingHistory = [{ tick: state.tick ?? 0, value: state.popularity }];
  state.randomSeed ??= 123456789; state.guestLimit ??= 7; state.level ??= 1; state.purchasedGuestSlots ??= 0;
  state.purchasedGuestSlots = Math.max(0, Math.min(10, Math.floor(state.purchasedGuestSlots)));
  state.maxGuestLimit = Math.max(state.maxGuestLimit ?? 0, state.guestLimit); state.furnitureInventory ??= {};
  // Старые сейвы могли содержать до пяти плит: сохраняем первые три и не теряем остальную мебель.
  const keptStoves = state.furniture.filter((item) => item.kind === 'stove').slice(0, 3);
  state.furniture = state.furniture.filter((item) => item.kind !== 'stove' || keptStoves.includes(item));
  for (const [kind, amount] of Object.entries(state.furnitureInventory)) state.furnitureInventory[kind as keyof typeof state.furnitureInventory] = Math.max(0, Math.min(99, Math.floor(Number.isFinite(amount) ? amount : 0)));
  state.furnitureInventory.stove = Math.min(Math.max(0, 3 - keptStoves.length), state.furnitureInventory.stove ?? 0);
  synchronizeChefStoves(state);
  state.ownedWallpapers ??= {};
  for (const [id, amount] of Object.entries(state.ownedWallpapers)) {
    if (!wallpaperById(id)) delete state.ownedWallpapers[id];
    else state.ownedWallpapers[id] = Math.max(0, Math.min(99, Math.floor(Number.isFinite(amount) ? amount : 0)));
  }
  const applied = Array.isArray(state.appliedWallpapers) ? state.appliedWallpapers : [];
  const uniqueWallpapers = new Map<string, AppliedWallpaper>();
  for (const rawItem of applied) {
    const item = rawItem as AppliedWallpaper & { wallSegmentId?: string };
    if (!item || !wallpaperById(item.wallpaperId)) continue;
    if (item.wallCellId && isStaticWallCell(item.wallCellId, state.width, state.height)) uniqueWallpapers.set(item.wallCellId, { wallCellId: item.wallCellId, wallpaperId: item.wallpaperId });
    else {
      const match = /^(north|south|west|east)-(\d+)$/.exec(item.wallSegmentId ?? '');
      if (!match || Number(match[2]) % 2 !== 0) continue;
      for (const index of [Number(match[2]), Number(match[2]) + 1]) {
        const wallCellId = `${match[1]}-${index}`;
        if (isStaticWallCell(wallCellId, state.width, state.height)) uniqueWallpapers.set(wallCellId, { wallCellId, wallpaperId: item.wallpaperId });
      }
    }
  }
  state.appliedWallpapers = [...uniqueWallpapers.values()];
  state.activeWallpaperId = state.activeWallpaperId && wallpaperById(state.activeWallpaperId) ? state.activeWallpaperId : null;
  // Старый глобальный узор сохраняется только на исходных восьми клетках каждой стены.
  if (!state.appliedWallpapers.length && state.activeWallpaperId) {
    for (const side of ['north', 'south', 'west', 'east'] as const) for (let index = 0; index < 8; index += 1) {
      const wallCellId = `${side}-${index}`;
      if (isWallCell(wallCellId, state.width, state.height)) state.appliedWallpapers.push({ wallCellId, wallpaperId: state.activeWallpaperId });
    }
  }
  if (!state.activeWallpaperId && state.appliedWallpapers.length) state.activeWallpaperId = state.appliedWallpapers[state.appliedWallpapers.length - 1].wallpaperId;
  if (state.wallpaperExpansionNormalized === undefined) {
    inheritExpandedWallpapers(state, 8, 8);
    state.wallpaperExpansionNormalized = true;
  }
  for (const appliedItem of state.appliedWallpapers) state.ownedWallpapers[appliedItem.wallpaperId] = Math.max(1, state.ownedWallpapers[appliedItem.wallpaperId] ?? 0);
  state.ownedDoorPatterns = Array.isArray(state.ownedDoorPatterns) ? [...new Set(state.ownedDoorPatterns.filter((id) => Boolean(doorPatternById(id))))] : [];
  if (!state.activeDoorPattern || !doorPatternById(state.activeDoorPattern)) state.activeDoorPattern = null;
  if (state.activeDoorPattern && !state.ownedDoorPatterns.includes(state.activeDoorPattern)) state.ownedDoorPatterns.push(state.activeDoorPattern);
  state.ownedFloorPatterns = Array.isArray(state.ownedFloorPatterns) ? [...new Set(state.ownedFloorPatterns.filter((id) => Boolean(floorPatternById(id))))] : [];
  if (!state.activeFloorPattern || !floorPatternById(state.activeFloorPattern)) state.activeFloorPattern = null;
  if (state.activeFloorPattern && !state.ownedFloorPatterns.includes(state.activeFloorPattern)) state.ownedFloorPatterns.push(state.activeFloorPattern);
  state.ownedFurnitureSkins = Array.isArray(state.ownedFurnitureSkins) ? [...new Set(state.ownedFurnitureSkins.filter((id) => Boolean(furnitureSkinById(id))))] : [];
  state.firstPurchaseApplied = Array.isArray(state.firstPurchaseApplied) ? [...new Set(state.firstPurchaseApplied.filter((id) => Boolean(furnitureSkinById(id))))] : [...state.ownedFurnitureSkins];
  const legacy = state.appliedFurnitureSkins as unknown as FurnitureSkinAssignment[] | Record<string, string>;
  const furnitureAssignments: FurnitureSkinAssignment[] = [];
  if (Array.isArray(legacy)) furnitureAssignments.push(...legacy);
  else if (legacy) for (const [kind, skinId] of Object.entries(legacy)) for (const item of state.furniture.filter((candidate) => candidate.kind === kind)) furnitureAssignments.push({ furnitureId: item.id, skinId });
  const normalizeFurniture = (value: unknown, kind: 'table' | 'tableDouble' | 'chair' | 'stove' | 'counter'): FurnitureSkinAssignment[] => {
    if (!Array.isArray(value)) return [];
    const unique = new Map<string, FurnitureSkinAssignment>();
    for (const assignment of value as FurnitureSkinAssignment[]) {
      const item = state.furniture.find((candidate) => candidate.id === assignment?.furnitureId && candidate.kind === kind);
      const skin = assignment ? furnitureSkinById(assignment.skinId) : undefined;
      if (item && skin?.kind === kind) unique.set(item.id, { furnitureId: item.id, skinId: skin.id });
    }
    return [...unique.values()];
  };
  state.appliedFurnitureSkins = normalizeFurniture(furnitureAssignments, 'table').concat(normalizeFurniture(furnitureAssignments, 'tableDouble'), normalizeFurniture(furnitureAssignments, 'chair'));
  state.appliedStoveSkins = normalizeFurniture(state.appliedStoveSkins, 'stove');
  state.appliedCounterSkins = normalizeFurniture(state.appliedCounterSkins, 'counter');
  const normalizeActors = (value: unknown, role: 'chef' | 'waiter'): ActorSkinAssignment[] => {
    if (!Array.isArray(value)) return [];
    const unique = new Map<string, ActorSkinAssignment>();
    for (const assignment of value as ActorSkinAssignment[]) {
      const employee = state.employees.find((candidate) => candidate.id === assignment?.employeeId && candidate.role === role);
      const skin = assignment ? furnitureSkinById(assignment.skinId) : undefined;
      if (employee && skin?.kind === role) unique.set(employee.id, { employeeId: employee.id, skinId: skin.id });
    }
    return [...unique.values()];
  };
  state.appliedChefSkins = normalizeActors(state.appliedChefSkins, 'chef'); state.appliedWaiterSkins = normalizeActors(state.appliedWaiterSkins, 'waiter');
  for (const assignment of [...state.appliedFurnitureSkins, ...state.appliedStoveSkins, ...state.appliedCounterSkins]) if (!state.ownedFurnitureSkins.includes(assignment.skinId)) state.ownedFurnitureSkins.push(assignment.skinId);
  for (const assignment of [...state.appliedChefSkins, ...state.appliedWaiterSkins]) if (!state.ownedFurnitureSkins.includes(assignment.skinId)) state.ownedFurnitureSkins.push(assignment.skinId);
  state.ownedPaintings = Array.isArray(state.ownedPaintings) ? [...new Set(state.ownedPaintings.filter((id) => Boolean(paintingById(id))))] : [];
  const acceptedPaintings: GameState['appliedPaintings'] = [];
  for (const placed of Array.isArray(state.appliedPaintings) ? state.appliedPaintings : []) {
    const painting = placed && paintingById(placed.paintingId);
    if (!painting || !['north', 'south', 'west', 'east'].includes(placed.side)) continue;
    const cells = paintingWallCells(painting, placed, state.width, state.height);
    if (!cells.length || cells.some((cell) => !isStaticWallCell(cell, state.width, state.height)) || (painting.heightCells > 1 && (placed.side === 'south' || placed.side === 'east'))) continue;
    if (acceptedPaintings.some((other) => paintingWallCells(paintingById(other.paintingId)!, other, state.width, state.height).some((cell) => cells.includes(cell)))) continue;
    if (!state.ownedPaintings.includes(placed.paintingId)) state.ownedPaintings.push(placed.paintingId);
    acceptedPaintings.push(placed);
  }
  state.appliedPaintings = acceptedPaintings;
  state.ownedWindows = Array.isArray(state.ownedWindows) ? state.ownedWindows.filter((id) => Boolean(windowById(id))) : [];
  const acceptedWindows: GameState['appliedWindows'] = [];
  const door = state.furniture.find((item) => item.kind === 'door');
  const doorCell = door ? door.position.y === 0 ? `north-${door.position.x}` : door.position.y === state.height - 1 ? `south-${door.position.x}` : door.position.x === 0 ? `west-${door.position.y}` : `east-${door.position.y}` : '';
  for (const placed of Array.isArray(state.appliedWindows) ? state.appliedWindows : []) {
    if (!placed || !windowById(placed.windowId) || !['north', 'south', 'west', 'east'].includes(placed.side) || !Number.isInteger(placed.index)) continue;
    const item = windowById(placed.windowId)!;
    const cells = windowWallCells(item, placed.side, placed.index, state.width, state.height);
    if (!cells.length || cells.some((cell) => !isStaticWallCell(cell, state.width, state.height) || cell === doorCell)) continue;
    if (item.heightCells > 1 && (placed.side === 'south' || placed.side === 'east')) continue;
    if (acceptedWindows.some((other) => windowWallCells(windowById(other.windowId)!, other.side, other.index, state.width, state.height).some((cell) => cells.includes(cell)))) continue;
    if (acceptedPaintings.some((other) => paintingWallCells(paintingById(other.paintingId)!, other, state.width, state.height).some((cell) => cells.includes(cell)))) continue;
    acceptedWindows.push(placed);
    state.ownedWindows.push(placed.windowId);
  }
  state.appliedWindows = acceptedWindows;
  state.ownedLoyaltyItems = Array.isArray(state.ownedLoyaltyItems) ? [...new Set(state.ownedLoyaltyItems.filter((id) => Boolean(loyaltyItemById(id))))] : [];
  if (state.furniture.some((item) => item.kind === 'plant') && !state.ownedLoyaltyItems.includes('plant')) state.ownedLoyaltyItems.push('plant');
  state.toleranceBonus = loyaltyBonus(state); state.decorationRatingBonus = calculateDecorationRating(state); recalculateGuestLimit(state); state.arrivalProgress = Number.isFinite(state.arrivalProgress) ? Math.max(0, state.arrivalProgress) : 0; state.completedQuestIds ??= [];
  if (state.level > 1) for (const id of STARTER_QUEST_IDS) if (!state.completedQuestIds.includes(id)) state.completedQuestIds.push(id);
  state.unlockedDishIds ??= ['soup']; state.servedTotal ??= 0; state.revenueTotal ??= 0; state.satisfiedStreak ??= 0; state.desiredServedTotal ??= 0; state.unhappyTotal ??= 0; state.paidExpansions ??= 0; state.upgrades ??= { cooking: 0, waiter: 0 };
  state.upgrades.cooking = Math.max(0, Math.min(5, Math.floor(state.upgrades.cooking ?? 0))); state.upgrades.waiter = Math.max(0, Math.min(5, Math.floor(state.upgrades.waiter ?? 0)));
  for (const employee of state.employees) employee.movementCredit = Number.isFinite(employee.movementCredit) ? Math.max(0, employee.movementCredit ?? 0) : 0;
  state.lastDailyReward ??= ''; state.calendar ??= { lastClaimDate: state.lastDailyReward, nextDayIndex: 0, cycle: 1 }; state.calendar.lastClaimDate ||= state.lastDailyReward;
  state.calendar.nextDayIndex = Math.max(0, Math.min(29, Math.floor(state.calendar.nextDayIndex ?? 0))); state.calendar.cycle = Math.max(1, Math.floor(state.calendar.cycle ?? 1));
  for (const customer of state.customers) {
    customer.foodWait ??= 120; const appearance = appearanceForId(customer.id); customer.bodyType ??= appearance.bodyType; customer.hairStyle ??= appearance.hairStyle;
    customer.hairColor ??= appearance.hairColor; customer.skinColor ??= appearance.skinColor; customer.outfitColor ??= appearance.outfitColor;
  }
  const stoveIds = new Set(state.furniture.filter((item) => item.kind === 'stove').map((item) => item.id));
  for (const order of state.orders) {
    order.dishId ??= 'soup';
    order.desired ??= false;
    order.deliveryProgress = Number.isFinite(order.deliveryProgress) ? Math.max(0, order.deliveryProgress!) : 0;
    order.stateChangedAt = Number.isFinite(order.stateChangedAt)
      ? Math.max(0, Math.min(state.tick, order.stateChangedAt!)) : state.tick;
    if (order.stoveId && !stoveIds.has(order.stoveId)) order.stoveId = undefined;
    if (order.state === 'waitingDelivery') ensureOrderCounter(state, order);
  }
  state.orders = state.orders.filter((order) => order.state !== 'delivered' || state.customers.some((customer) => customer.id === order.customerId));
  for (const waiter of state.employees.filter((employee) => employee.role === 'waiter')) {
    const savedIds = Array.isArray(waiter.orderIds) ? waiter.orderIds.filter((id) => typeof id === 'string') : [];
    const carriedIds = state.orders.filter((order) => order.state === 'waitingDelivery' && order.pickedUp && order.assignedTo === waiter.id).map((order) => order.id);
    waiter.orderIds = [...new Set([...savedIds, ...carriedIds])].filter((id) => carriedIds.includes(id));
    if (waiter.orderIds.length && (!waiter.taskId || !waiter.orderIds.includes(waiter.taskId))) waiter.taskId = waiter.orderIds[0];
  }
  normalizeQueueState(state);
  normalizePeakState(state);
  state.questBaseline ??= captureQuestBaseline(state);
  state.completedSideQuestIds ??= [];
  state.dailyQuestState ??= { date: '', id: '', progress: 0, rewarded: false };
  state.peakQuestTotals ??= { servedTotal: 0, perfectPeaksTotal: 0 };
  state.peakQuestTotals.perfectPeaksTotal ??= 0;
  return state;

}
