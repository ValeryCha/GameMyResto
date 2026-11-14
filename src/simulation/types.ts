export type Role = 'chef' | 'waiter';
export type FurnitureKind = 'door' | 'stove' | 'table' | 'tableDouble' | 'chair' | 'plant' | 'counter';
export interface Point { x: number; y: number }
export interface Employee { id: string; role: Role; position: Point; energy: number; target?: Point; taskId?: string }
export interface Furniture { id: string; kind: FurnitureKind; position: Point; rotation: 0 | 90 | 180 | 270 }
export type CustomerState = 'entering' | 'waiting' | 'seekingSeat' | 'wandering' | 'inspecting' | 'seated' | 'ordering' | 'waitingFood' | 'eating' | 'leaving';
export interface Customer { id: string; position: Point; state: CustomerState; patience: number; target?: Point; orderId?: string; seatId?: string; actionUntil?: number; foodWait?: number }
export interface Order { id: string; customerId: string; state: 'waitingCook' | 'cooking' | 'waitingDelivery' | 'delivered'; progress: number; dishId?: string; assignedTo?: string; pickedUp?: boolean }
export interface GameState {
  version: 1;
  coins: number;
  experience: number;
  level: number;
  completedQuestIds: string[];
  unlockedDishIds: string[];
  servedTotal: number;
  paidExpansions: number;
  popularity: number;
  tick: number;
  width: number;
  height: number;
  randomSeed: number;
  guestLimit: number;
  employees: Employee[];
  furniture: Furniture[];
  customers: Customer[];
  orders: Order[];
}
export interface CommandResult { ok: boolean; reason?: string }
