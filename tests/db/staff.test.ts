import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './harness';

let t: TestDb;
let yakisoba: string;
let juice: string;

async function addItem(name: string, price: number, sort: number) {
  const rows = await t.asOwner<{ id: string }>(
    'insert into menu_items(name, price_tickets, sort_order) values ($1, $2, $3) returning id',
    [name, price, sort],
  );
  return rows[0].id;
}

async function order(items: [string, number][]) {
  const rows = await t.asAnon<{ r: { token: string; number: number } }>('select place_order($1::jsonb) as r', [
    JSON.stringify(items.map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }))),
  ]);
  const id = await t.asOwner<{ id: string }>('select id from orders where token = $1', [rows[0].r.token]);
  return { ...rows[0].r, id: id[0].id };
}

async function act(id: string, action: string) {
  const rows = await t.asService<{ r: string }>('select staff_update_order($1::uuid, $2) as r', [id, action]);
  return rows[0].r;
}

async function sentCount() {
  const rows = await t.asOwner<{ n: number }>(
    "select count(*)::int as n from realtime.sent_log where topic = 'shop' and event = 'changed' and private = false",
  );
  return rows[0].n;
}

beforeEach(async () => {
  t = await createTestDb();
  yakisoba = await addItem('焼きそば', 3, 0);
  juice = await addItem('ジュース', 1, 1);
});

describe('staff_update_order', () => {
  it.each([
    ['cooking', 'complete', 'ready'],
    ['cooking', 'cancel', 'cancelled'],
    ['ready', 'deliver', 'delivered'],
    ['ready', 'revert', 'cooking'],
    ['ready', 'cancel', 'cancelled'],
  ])('from %s, %s → %s', async (from, action, to) => {
    const o = await order([[juice, 1]]);
    await t.asOwner('update orders set status = $1 where id = $2', [from, o.id]);
    expect(await act(o.id, action)).toBe(to);
    const rows = await t.asOwner<{ status: string }>('select status from orders where id = $1', [o.id]);
    expect(rows[0].status).toBe(to);
  });

  it.each([
    ['cooking', 'deliver'],
    ['cooking', 'revert'],
    ['ready', 'complete'],
    ['delivered', 'cancel'],
    ['delivered', 'revert'],
    ['cancelled', 'complete'],
    ['cancelled', 'deliver'],
  ])('rejects %s + %s', async (from, action) => {
    const o = await order([[juice, 1]]);
    await t.asOwner('update orders set status = $1 where id = $2', [from, o.id]);
    await expect(act(o.id, action)).rejects.toThrow('invalid_transition');
  });

  it('rejects a second complete (double tap / two devices)', async () => {
    const o = await order([[juice, 1]]);
    expect(await act(o.id, 'complete')).toBe('ready');
    await expect(act(o.id, 'complete')).rejects.toThrow('invalid_transition');
  });

  it('rejects complete after the customer cancelled', async () => {
    const o = await order([[juice, 1]]);
    await t.asAnon('select cancel_my_order($1::uuid)', [o.token]);
    await expect(act(o.id, 'complete')).rejects.toThrow('invalid_transition');
  });

  it('rejects an unknown action', async () => {
    const o = await order([[juice, 1]]);
    await expect(act(o.id, 'eat')).rejects.toThrow('invalid_transition');
  });

  it('sets and clears ready_at', async () => {
    const o = await order([[juice, 1]]);
    await act(o.id, 'complete');
    let rows = await t.asOwner<{ ready_at: unknown }>('select ready_at from orders where id = $1', [o.id]);
    expect(rows[0].ready_at).not.toBeNull();
    await act(o.id, 'revert');
    rows = await t.asOwner<{ ready_at: unknown }>('select ready_at from orders where id = $1', [o.id]);
    expect(rows[0].ready_at).toBeNull();
  });
});

describe('staff_list_orders', () => {
  it("lists only today's cooking and ready orders in number order", async () => {
    const a = await order([[yakisoba, 2], [juice, 1]]);
    const b = await order([[juice, 1]]);
    const c = await order([[juice, 2]]);
    const d = await order([[juice, 1]]);
    const e = await order([[juice, 1]]);
    await act(b.id, 'complete');
    await act(c.id, 'complete');
    await act(c.id, 'deliver');
    await act(d.id, 'cancel');
    await t.asOwner('update orders set business_date = app_today() - 1 where id = $1', [e.id]);

    const rows = await t.asService<{ r: { cooking: Record<string, unknown>[]; ready: Record<string, unknown>[] } }>(
      'select staff_list_orders() as r',
    );
    const { cooking, ready } = rows[0].r;
    expect(cooking.map((o) => o.number)).toEqual([1]);
    expect(ready.map((o) => o.number)).toEqual([2]);
    expect(cooking[0]).toMatchObject({
      id: a.id,
      status: 'cooking',
      readyAt: null,
      totalTickets: 7,
      items: [
        { name: '焼きそば', quantity: 2 },
        { name: 'ジュース', quantity: 1 },
      ],
    });
    expect(typeof cooking[0].createdAt).toBe('string');
    expect(typeof ready[0].readyAt).toBe('string');
  });
});

describe('sales_summary', () => {
  it('counts only delivered orders', async () => {
    const a = await order([[yakisoba, 2], [juice, 1]]);
    const b = await order([[yakisoba, 1]]);
    const c = await order([[juice, 3]]);
    await order([[juice, 1]]); // still cooking
    for (const o of [a, b]) {
      await act(o.id, 'complete');
      await act(o.id, 'deliver');
    }
    await act(c.id, 'cancel');

    const rows = await t.asService<{ r: Record<string, unknown> }>('select sales_summary(null) as r');
    expect(rows[0].r).toMatchObject({
      ticketsTotal: 10,
      deliveredCount: 2,
      cancelledCount: 1,
      items: [
        { name: '焼きそば', quantity: 3, tickets: 9 },
        { name: 'ジュース', quantity: 1, tickets: 1 },
      ],
    });
  });

  it('filters by business date but lists every date', async () => {
    const a = await order([[yakisoba, 1]]);
    const b = await order([[juice, 1]]);
    for (const o of [a, b]) {
      await act(o.id, 'complete');
      await act(o.id, 'deliver');
    }
    await t.asOwner('update orders set business_date = app_today() - 1 where id = $1', [a.id]);
    const today = (await t.asOwner<{ d: string }>("select to_char(app_today(), 'YYYY-MM-DD') as d"))[0].d;
    const yesterday = (await t.asOwner<{ d: string }>("select to_char(app_today() - 1, 'YYYY-MM-DD') as d"))[0].d;

    const rows = await t.asService<{ r: Record<string, unknown> }>('select sales_summary($1::date) as r', [today]);
    expect(rows[0].r).toMatchObject({
      ticketsTotal: 1,
      deliveredCount: 1,
      items: [{ name: 'ジュース', quantity: 1, tickets: 1 }],
      dates: [today, yesterday],
    });
  });

  it('returns zeros and an empty list with no orders', async () => {
    const rows = await t.asService<{ r: Record<string, unknown> }>('select sales_summary(null) as r');
    expect(rows[0].r).toEqual({ ticketsTotal: 0, deliveredCount: 0, cancelledCount: 0, items: [], dates: [] });
  });
});

describe('admin functions', () => {
  it('hides an item that has orders instead of deleting it', async () => {
    await order([[juice, 1]]);
    const rows = await t.asService<{ r: string }>('select admin_delete_menu_item($1::uuid) as r', [juice]);
    expect(rows[0].r).toBe('hidden');
    const item = await t.asOwner<{ is_visible: boolean }>('select is_visible from menu_items where id = $1', [juice]);
    expect(item).toEqual([{ is_visible: false }]);
  });

  it('deletes an item without orders', async () => {
    const rows = await t.asService<{ r: string }>('select admin_delete_menu_item($1::uuid) as r', [yakisoba]);
    expect(rows[0].r).toBe('deleted');
    const item = await t.asOwner('select 1 from menu_items where id = $1', [yakisoba]);
    expect(item).toHaveLength(0);
  });

  it('reorders the menu', async () => {
    const c = await addItem('フランク', 2, 2);
    await t.asService('select admin_reorder_menu($1::uuid[])', [[c, yakisoba, juice]]);
    const rows = await t.asOwner<{ id: string; sort_order: number }>('select id, sort_order from menu_items');
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.sort_order]));
    expect(byId).toEqual({ [c]: 0, [yakisoba]: 1, [juice]: 2 });
  });
});

describe('change broadcast', () => {
  it('signals on order create, status change and menu update', async () => {
    const before = await sentCount();
    const o = await order([[juice, 1]]);
    const afterOrder = await sentCount();
    expect(afterOrder).toBeGreaterThan(before);
    await act(o.id, 'complete');
    const afterStatus = await sentCount();
    expect(afterStatus).toBeGreaterThan(afterOrder);
    await t.asService('update menu_items set is_sold_out = true where id = $1', [juice]);
    expect(await sentCount()).toBeGreaterThan(afterStatus);
  });

  it('carries no order details', async () => {
    await order([[juice, 1]]);
    const rows = await t.asOwner<{ payload: Record<string, unknown> }>('select payload from realtime.sent_log');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(Object.keys(r.payload)).toEqual(['table']);
  });
});

describe('staff function permissions', () => {
  it.each([
    'select staff_list_orders()',
    'select sales_summary(null)',
    "select staff_update_order('00000000-0000-0000-0000-000000000000'::uuid, 'complete')",
    "select admin_delete_menu_item('00000000-0000-0000-0000-000000000000'::uuid)",
    'select admin_reorder_menu(array[]::uuid[])',
  ])('anon cannot run: %s', async (sql) => {
    await expect(t.asAnon(sql)).rejects.toThrow(/permission denied/);
  });
});
