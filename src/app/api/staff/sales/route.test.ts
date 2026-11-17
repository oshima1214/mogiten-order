import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
let authorized = true;

vi.mock('@/lib/auth/requireStaff', () => ({
  requireStaff: async () => (authorized ? null : Response.json({ error: 'unauthorized' }, { status: 401 })),
}));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ rpc }) }));

const { GET } = await import('./route');

const call = (query = '') => GET(new Request(`http://localhost/api/staff/sales${query}`));
const summary = { ticketsTotal: 0, deliveredCount: 0, cancelledCount: 0, items: [], dates: [] };

beforeEach(() => {
  authorized = true;
  rpc.mockReset();
  rpc.mockResolvedValue({ data: summary, error: null });
});
afterEach(() => vi.useRealTimers());

describe('GET /api/staff/sales', () => {
  it('requires a staff session', async () => {
    authorized = false;
    expect((await call()).status).toBe(401);
  });

  it.each(['2026-13-01', '2026-02-30', 'yesterday', '2026-1-1'])('rejects date=%s', async (d) => {
    expect((await call(`?date=${d}`)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes null for all days', async () => {
    const res = await call('?date=all');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);
    expect(rpc).toHaveBeenCalledWith('sales_summary', { p_date: null });
  });

  it('passes a valid date through', async () => {
    await call('?date=2026-11-16');
    expect(rpc).toHaveBeenCalledWith('sales_summary', { p_date: '2026-11-16' });
  });

  it('defaults to today in Asia/Tokyo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T15:30:00Z'));
    await call();
    expect(rpc).toHaveBeenCalledWith('sales_summary', { p_date: '2026-11-18' });
  });
});
