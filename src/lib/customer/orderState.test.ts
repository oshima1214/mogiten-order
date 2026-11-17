import { describe, expect, it } from 'vitest';
import type { MyOrder, OrderStatus } from '@/lib/types';
import { applyFetched, CANCELLED_BY_STAFF } from './orderState';

const order = (status: OrderStatus): MyOrder => ({
  number: 7,
  status,
  items: [{ name: 'ジュース', quantity: 1 }],
  totalTickets: 1,
  aheadCount: 0,
  waitingTotal: 1,
});

describe('applyFetched', () => {
  it.each(['cooking', 'ready'] as const)('shows a %s order and keeps the token', (status) => {
    expect(applyFetched(order(status))).toEqual({ order: order(status), clearToken: false, notice: null });
  });

  it('returns to the menu silently after delivery', () => {
    expect(applyFetched(order('delivered'))).toEqual({ order: null, clearToken: true, notice: null });
  });

  it('explains a cancellation by staff', () => {
    expect(applyFetched(order('cancelled'))).toEqual({ order: null, clearToken: true, notice: CANCELLED_BY_STAFF });
  });

  it('drops an unknown or old token silently', () => {
    expect(applyFetched(null)).toEqual({ order: null, clearToken: true, notice: null });
  });

  it('uses the agreed wording', () => {
    expect(CANCELLED_BY_STAFF).toBe('ご注文は取り消されました。お手数ですが、もう一度ご注文ください');
  });
});
