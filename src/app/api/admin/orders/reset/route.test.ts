import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
let authorized = true;

vi.mock('@/lib/auth/requireStaff', () => ({
  requireStaff: async () => (authorized ? null : Response.json({ error: 'unauthorized' }, { status: 401 })),
}));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ rpc }) }));

const { POST } = await import('./route');

const call = (body: unknown) =>
  POST(
    new Request('http://localhost/api/admin/orders/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  authorized = true;
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe('POST /api/admin/orders/reset', () => {
  it('requires a staff session', async () => {
    authorized = false;
    expect((await call({ confirm: '削除' })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([{ confirm: 'さくじょ' }, {}, { confirm: ' 削除' }])('rejects %j', async (body) => {
    const res = await call(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: '確認のため「削除」と入力してください' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('wipes orders with the exact confirmation word', async () => {
    const res = await call({ confirm: '削除' });
    expect(res.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith('admin_reset_orders');
  });

  it('reports database errors as 500', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await call({ confirm: '削除' })).status).toBe(500);
  });
});
