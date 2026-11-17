import { validateItemName, validatePriceTickets } from '@/lib/admin/validate';
import { requireStaff } from '@/lib/auth/requireStaff';
import { MENU_COLUMNS, mapMenuRow, type MenuRow } from '@/lib/menu/mapRow';
import { createServiceClient } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  const { id } = await params;

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if ('name' in body) {
    const v = validateItemName(body.name);
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    update.name = v.value;
  }
  if ('priceTickets' in body) {
    const v = validatePriceTickets(body.priceTickets);
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    update.price_tickets = v.value;
  }
  for (const [key, column] of [
    ['isVisible', 'is_visible'],
    ['isSoldOut', 'is_sold_out'],
  ] as const) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') return Response.json({ error: '値が正しくありません' }, { status: 400 });
      update[column] = body[key];
    }
  }
  if (Object.keys(update).length === 0) return Response.json({ error: '変更する項目がありません' }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from('menu_items')
    .update(update)
    .eq('id', id)
    .select(MENU_COLUMNS)
    .maybeSingle();
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  if (!data) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json(mapMenuRow(data as MenuRow));
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireStaff(request);
  if (denied) return denied;
  const { id } = await params;

  const sb = createServiceClient();
  const before = await sb.from('menu_items').select('image_path').eq('id', id).maybeSingle();
  const { data, error } = await sb.rpc('admin_delete_menu_item', { p_id: id });
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  if (data === 'deleted' && before.data?.image_path) {
    await sb.storage.from('menu-images').remove([before.data.image_path]);
  }
  return Response.json({ result: data });
}
