import { describe, expect, it } from 'vitest';
import { cartLines, cartTotals, setQuantity, toOrderPayload } from './cart';
import type { MenuItem } from './types';

const item = (id: string, priceTickets: number): MenuItem => ({
  id, name: id, priceTickets, sortOrder: 0, imagePath: null, isVisible: true, isSoldOut: false,
});

describe('setQuantity', () => {
  it('sets a quantity', () => expect(setQuantity({}, 'a', 3)).toEqual({ a: 3 }));
  it('removes the key at 0', () => expect(setQuantity({ a: 3 }, 'a', 0)).toEqual({}));
  it('clamps to 10', () => expect(setQuantity({}, 'a', 11)).toEqual({ a: 10 }));
  it('treats negatives as 0', () => expect(setQuantity({}, 'a', -1)).toEqual({}));
  it('does not mutate the input', () => {
    const cart = { a: 1 };
    setQuantity(cart, 'a', 2);
    expect(cart).toEqual({ a: 1 });
  });
});

describe('cartTotals', () => {
  const menu = [item('a', 3), item('b', 1)];
  it('sums count and tickets', () => expect(cartTotals({ a: 2, b: 1 }, menu)).toEqual({ count: 3, tickets: 7 }));
  it('ignores ids not on the menu', () => expect(cartTotals({ a: 1, zzz: 4 }, menu)).toEqual({ count: 1, tickets: 3 }));
});

describe('toOrderPayload', () => {
  it('maps the cart to RPC input', () =>
    expect(toOrderPayload({ a: 2 })).toEqual([{ menu_item_id: 'a', quantity: 2 }]));
});

describe('cartLines', () => {
  const menu = [item('a', 3), item('b', 1), item('c', 2)];
  it('lists chosen items in menu order with their tickets', () =>
    expect(cartLines({ c: 1, a: 2 }, menu)).toEqual([
      { id: 'a', name: 'a', quantity: 2, tickets: 6 },
      { id: 'c', name: 'c', quantity: 1, tickets: 2 },
    ]));
  it('skips ids that are not on the menu', () => expect(cartLines({ zzz: 1 }, menu)).toEqual([]));
});
