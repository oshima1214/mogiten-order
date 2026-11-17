import { requireStaff } from '@/lib/auth/requireStaff';
import { MENU_COLUMNS, mapMenuRow, type MenuRow } from '@/lib/menu/mapRow';
import { createServiceClient } from '@/lib/supabase/server';
import type { StaffOrder } from '@/lib/types';

export async function GET(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const sb = createServiceClient();
  const [orders, menu] = await Promise.all([
    sb.rpc('staff_list_orders'),
    sb.from('menu_items').select(MENU_COLUMNS).eq('is_visible', true).order('sort_order').order('created_at'),
  ]);
  if (orders.error || menu.error) return Response.json({ error: 'server_error' }, { status: 500 });

  const { cooking, ready } = orders.data as { cooking: StaffOrder[]; ready: StaffOrder[] };
  return Response.json(
    { cooking, ready, menu: (menu.data as MenuRow[]).map(mapMenuRow) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
