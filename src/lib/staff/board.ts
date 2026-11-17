import type { OrderLine, StaffOrder } from '@/lib/types';

export const OVERDUE_MINUTES = 10;

export function itemTotals(orders: StaffOrder[]): OrderLine[] {
  const totals = new Map<string, number>();
  for (const o of orders) for (const l of o.items) totals.set(l.name, (totals.get(l.name) ?? 0) + l.quantity);
  return [...totals].map(([name, quantity]) => ({ name, quantity }));
}

export function elapsedMinutes(createdAt: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(createdAt)) / 60_000));
}

export function isOverdue(createdAt: string, nowMs: number): boolean {
  return elapsedMinutes(createdAt, nowMs) >= OVERDUE_MINUTES;
}
