import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './harness';

let t: TestDb;
let yakisoba: string;
let juice: string;
let hidden: string;
let soldOut: string;
let nextSort = 0;

async function addItem(name: string, price: number, opts: { visible?: boolean; soldOut?: boolean } = {}) {
  const rows = await t.asOwner<{ id: string }>(
    'insert into menu_items(name, price_tickets, is_visible, is_sold_out, sort_order) values ($1, $2, $3, $4, $5) returning id',
    [name, price, opts.visible ?? true, opts.soldOut ?? false, nextSort++],
  );
  return rows[0].id;
}

async function placeOrder(items: { menu_item_id: string; quantity: number }[]) {
  const rows = await t.asAnon<{ r: { token: string; number: number } }>('select place_order($1::jsonb) as r', [
    JSON.stringify(items),
  ]);
  return rows[0].r;
}

async function myOrder(token: string) {
  const rows = await t.asAnon<{ r: unknown }>('select get_my_order($1::uuid) as r', [token]);
  return rows[0].r as Record<string, unknown> | null;
}


beforeEach(async () => {
  t = await createTestDb();
  nextSort = 0;
  yakisoba = await addItem('焼きそば', 3);
  juice = await addItem('ジュース', 1);
  hidden = await addItem('非表示', 2, { visible: false });
  soldOut = await addItem('チュロス', 2, { soldOut: true });
});

describe('place_order', () => {
  it('numbers orders from 1 and copies name and price', async () => {
    const first = await placeOrder([
      { menu_item_id: yakisoba, quantity: 2 },
      { menu_item_id: juice, quantity: 1 },
    ]);
    const second = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
    expect(first.token).toMatch(/^[0-9a-f-]{36}$/);

    await t.asOwner("update menu_items set name = '改名', price_tickets = 9 where id = $1", [yakisoba]);
    const lines = await t.asOwner<{ name: string; price_tickets: number; quantity: number }>(
      `select oi.name, oi.price_tickets, oi.quantity from order_items oi join orders o on o.id = oi.order_id
       where o.number = 1 order by oi.name`,
    );
    expect(lines).toEqual([
      { name: 'ジュース', price_tickets: 1, quantity: 1 },
      { name: '焼きそば', price_tickets: 3, quantity: 2 },
    ]);
  });

  it('restarts numbering each business day', async () => {
    await t.asOwner("insert into order_counters(business_date, last_number) values (app_today() - 1, 57)");
    const r = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    expect(r.number).toBe(1);
  });

  it('rejects an empty order', async () => {
    await expect(placeOrder([])).rejects.toThrow('empty_order');
  });

  it.each([0, 11])('rejects quantity %i', async (q) => {
    await expect(placeOrder([{ menu_item_id: juice, quantity: q }])).rejects.toThrow('invalid_quantity');
  });

  it('rejects hidden and unknown items', async () => {
    await expect(placeOrder([{ menu_item_id: hidden, quantity: 1 }])).rejects.toThrow('item_unavailable');
    await expect(
      placeOrder([{ menu_item_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }]),
    ).rejects.toThrow('item_unavailable');
  });

  it('rejects sold-out items and creates nothing', async () => {
    await expect(
      placeOrder([
        { menu_item_id: juice, quantity: 1 },
        { menu_item_id: soldOut, quantity: 1 },
      ]),
    ).rejects.toThrow('sold_out');
    const count = await t.asOwner<{ n: number }>('select count(*)::int as n from orders');
    expect(count[0].n).toBe(0);
  });
});

describe('get_my_order', () => {
  it('reports position, waiting total and tickets', async () => {
    const a = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    const c = await placeOrder([
      { menu_item_id: yakisoba, quantity: 2 },
      { menu_item_id: juice, quantity: 1 },
    ]);

    expect(await myOrder(c.token)).toEqual({
      number: 3,
      status: 'cooking',
      items: [
        { name: '焼きそば', quantity: 2 },
        { name: 'ジュース', quantity: 1 },
      ],
      totalTickets: 7,
      aheadCount: 2,
      waitingTotal: 3,
    });

    await t.asOwner("update orders set status = 'ready' where token = $1", [a.token]);
    const after = await myOrder(c.token);
    expect(after?.aheadCount).toBe(1);
    expect(after?.waitingTotal).toBe(2);
    const readyOne = await myOrder(a.token);
    expect(readyOne?.status).toBe('ready');
    expect(readyOne?.aheadCount).toBe(0);
  });

  it.each(['delivered', 'cancelled'])('reports a %s order so the phone can tell the customer', async (status) => {
    const a = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    await t.asOwner('update orders set status = $1 where token = $2', [status, a.token]);
    expect(await myOrder(a.token)).toMatchObject({ number: 1, status, aheadCount: 0 });
  });

  it("returns null for a previous day's order", async () => {
    const a = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    await t.asOwner('update orders set business_date = app_today() - 1 where token = $1', [a.token]);
    expect(await myOrder(a.token)).toBeNull();
  });

  it('returns null for an unknown token', async () => {
    expect(await myOrder('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('cancelling', () => {
  it('is not available to customers (staff only)', async () => {
    const a = await placeOrder([{ menu_item_id: juice, quantity: 1 }]);
    await expect(t.asAnon('select cancel_my_order($1::uuid)', [a.token])).rejects.toThrow(
      /does not exist|permission denied/,
    );
  });
});

describe('anon permissions', () => {
  it('cannot read orders directly', async () => {
    await expect(t.asAnon('select * from orders')).rejects.toThrow(/permission denied/);
    await expect(t.asAnon('select * from order_items')).rejects.toThrow(/permission denied/);
  });

  it('sees only visible menu items', async () => {
    const rows = await t.asAnon<{ name: string }>('select name from menu_items order by name');
    expect(rows.map((r) => r.name)).not.toContain('非表示');
    expect(rows).toHaveLength(3);
  });

  it('cannot modify menu items', async () => {
    await expect(t.asAnon("update menu_items set price_tickets = 1")).rejects.toThrow(/permission denied/);
  });

  it('can read the shop name', async () => {
    const rows = await t.asAnon<{ shop_name: string }>('select shop_name from settings');
    expect(rows).toEqual([{ shop_name: '模擬店' }]);
  });
});
