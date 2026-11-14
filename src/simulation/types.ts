export type Role = 'chef' | 'waiter';
export type FurnitureKind = 'door' | 'stove' | 'table' | 'chair' | 'plant';
export interface Point { x: number; y: number }
export interface Employee { id: string; role: Role; position: Point; energy: number; target?: Point }
export interface Furniture { id: string; kind: FurnitureKind; position: Point; rotation: 0 | 90 | 180 | 270 }
export interface Customer { id: string; position: Point; state: 'entering' | 'waiting' | 'ordering' | 'waitingFood' | 'eating' | 'leaving'; patience: number; target?: Point; orderId?: string }
export interface Order { id: string; customerId: string; state: 'waitingCook' | 'cooking' | 'waitingDelivery' | 'delivered'; progress: number }
export interface GameState {
  version: 1;
  coins: number;
  experience: number;
  popularity: number;
  tick: number;
  width: 8;
  height: 8;
  employees: Employee[];
  furniture: Furniture[];
  customers: Customer[];
  orders: Order[];
}
export interface CommandResult { ok: boolean; reason?: string }
