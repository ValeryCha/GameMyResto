import type { Employee } from './types';

export type StaffUpgradeKind = 'cooking' | 'waiter';
export const MAX_WAITERS = 5;
export const MAX_CHEFS = 3;
export const MAX_UPGRADE_LEVEL = 5;
export const UPGRADE_LEVELS = { cooking: 2, waiter: 3 } as const;

const roundToFive = (value: number) => Math.round(value / 5) * 5;

export function waiterHirePrice(count: number): number {
  return roundToFive(200 * Math.pow(1.2, count));
}

export function chefHirePrice(count: number): number {
  return count <= 1 ? 1000 : 2500;
}

export function upgradePrice(kind: StaffUpgradeKind, level: number): number {
  const base = kind === 'waiter' ? 500 : 300;
  const multiplier = kind === 'waiter' ? 1.35 : 1.3;
  return roundToFive(base * Math.pow(multiplier, level));
}

export function cookingProgress(level: number): number {
  return 1 / (1 - 0.08 * Math.max(0, Math.min(MAX_UPGRADE_LEVEL, level)));
}

export function waiterMovementSteps(employee: Employee, level: number): number {
  const speed = 2 / (1 - 0.07 * Math.max(0, Math.min(MAX_UPGRADE_LEVEL, level)));
  employee.movementCredit = (employee.movementCredit ?? 0) + speed;
  const steps = Math.floor(employee.movementCredit);
  employee.movementCredit -= steps;
  return steps;
}
