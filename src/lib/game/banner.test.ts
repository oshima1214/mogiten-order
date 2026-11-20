import { describe, expect, it } from 'vitest';
import type { MyOrder, OrderStatus } from '@/lib/types';
import { gameBanner } from './banner';

const order = (status: OrderStatus): MyOrder => ({
  number: 12,
  status,
  items: [],
  totalTickets: 1,
  aheadCount: 0,
  waitingTotal: 0,
});

describe('gameBanner', () => {
  it('announces a ready order', () => {
    expect(gameBanner(order('ready'), null)).toEqual({ kind: 'ready', number: 12 });
  });

  it('shows nothing while cooking', () => {
    expect(gameBanner(order('cooking'), null)).toBeNull();
  });

  it('tells the customer when staff cancelled the order', () => {
    expect(gameBanner(null, 'ご注文は取り消されました。')).toEqual({ kind: 'notice', text: 'ご注文は取り消されました。' });
  });

  it('shows nothing on the menu without a notice', () => {
    expect(gameBanner(null, null)).toBeNull();
  });
});
