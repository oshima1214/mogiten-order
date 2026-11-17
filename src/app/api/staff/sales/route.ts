import { requireStaff } from '@/lib/auth/requireStaff';
import { isIsoDate, tokyoToday } from '@/lib/date';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const param = new URL(request.url).searchParams.get('date');
  let date: string | null;
  if (param === 'all') date = null;
  else if (param === null) date = tokyoToday();
  else if (isIsoDate(param)) date = param;
  else return Response.json({ error: 'invalid_date' }, { status: 400 });

  const { data, error } = await createServiceClient().rpc('sales_summary', { p_date: date });
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return Response.json(data, { headers: { 'cache-control': 'no-store' } });
}
