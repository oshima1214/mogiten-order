import type { MenuItem } from './types';

export type Cart = Record<string, number>;

export const MAX_QUANTITY = 10;

export function setQuantity(cart: Cart, id: string, qty: number): Cart {
  const next = { ...cart };
  const clamped = Math.min(MAX_QUANTITY, Math.max(0, Math.floor(qty)));
  if (clamped === 0) delete next[id];
  else next[id] = clamped;
  return next;
}

export function cartTotals(cart: Cart, menu: MenuItem[]): { count: number; tickets: number } {
  let count = 0;
  let tickets = 0;
  for (const item of menu) {
    const qty = cart[item.id] ?? 0;
    count += qty;
    tickets += qty * item.priceTickets;
  }
  return { count, tickets };
}

export function toOrderPayload(cart: Cart): { menu_item_id: string; quantity: number }[] {
  return Object.entries(cart).map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }));
}
