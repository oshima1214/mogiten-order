import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
let authorized = true;

vi.mock('@/lib/auth/requireStaff', () => ({
  requireStaff: async () => (authorized ? null : Response.json({ error: 'unauthorized' }, { status: 401 })),
}));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ rpc }) }));

const { POST } = await import('./route');

function call(body: unknown) {
  const req = new Request('http://localhost/api/staff/orders/abc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id: 'abc' }) });
}

beforeEach(() => {
  authorized = true;
  rpc.mockReset();
});

describe('POST /api/staff/orders/[id]', () => {
  it('requires a staff session', async () => {
    authorized = false;
    const res = await call({ action: 'complete' });
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects unknown actions', async () => {
    const res = await call({ action: 'eat' });
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps invalid_transition to 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_transition' } });
    const res = await call({ action: 'complete' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'invalid_transition' });
  });

  it('returns the new status', async () => {
    rpc.mockResolvedValue({ data: 'ready', error: null });
    const res = await call({ action: 'complete' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
    expect(rpc).toHaveBeenCalledWith('staff_update_order', { p_id: 'abc', p_action: 'complete' });
  });

  it('reports other database errors as 500', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });
    const res = await call({ action: 'deliver' });
    expect(res.status).toBe(500);
  });
});
