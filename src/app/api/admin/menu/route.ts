import { validateMenuInput } from '@/lib/admin/validate';
import { requireStaff } from '@/lib/auth/requireStaff';
import { MENU_COLUMNS, mapMenuRow, type MenuRow } from '@/lib/menu/mapRow';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const sb = createServiceClient();
  const [settings, menu] = await Promise.all([
    sb.from('settings').select('shop_name').eq('id', 1).single(),
    sb.from('menu_items').select(MENU_COLUMNS).order('sort_order').order('created_at'),
  ]);
  if (settings.error || menu.error) return Response.json({ error: 'server_error' }, { status: 500 });
  return Response.json(
    { shopName: settings.data.shop_name, menu: (menu.data as MenuRow[]).map(mapMenuRow) },
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const body = ((await request.json().catch(() => null)) ?? {}) as { name?: unknown; priceTickets?: unknown };
  const input = validateMenuInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  const sb = createServiceClient();
  const last = await sb.from('menu_items').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sortOrder = (last.data?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await sb
    .from('menu_items')
    .insert({ name: input.value.name, price_tickets: input.value.priceTickets, sort_order: sortOrder })
    .select(MENU_COLUMNS)
    .single();
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return Response.json(mapMenuRow(data as MenuRow), { status: 201 });
}
