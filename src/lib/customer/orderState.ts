import type { MyOrder } from '@/lib/types';

export const CANCELLED_BY_STAFF = 'ご注文は取り消されました。お手数ですが、もう一度ご注文ください';

export type Applied = { order: MyOrder | null; clearToken: boolean; notice: string | null };

/**
 * Decides what the phone shows after fetching the customer's order.
 * Only staff can cancel, so a cancelled order is always explained on the menu.
 */
export function applyFetched(fetched: MyOrder | null): Applied {
  if (!fetched || fetched.status === 'delivered') return { order: null, clearToken: true, notice: null };
  if (fetched.status === 'cancelled') return { order: null, clearToken: true, notice: CANCELLED_BY_STAFF };
  return { order: fetched, clearToken: false, notice: null };
}
