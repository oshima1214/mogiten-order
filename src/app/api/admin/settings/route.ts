import { validateShopName } from '@/lib/admin/validate';
import { requireStaff } from '@/lib/auth/requireStaff';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { shopName?: unknown } | null;
  const name = validateShopName(body?.shopName);
  if (!name.ok) return Response.json({ error: name.error }, { status: 400 });

  const { error } = await createServiceClient().from('settings').update({ shop_name: name.value }).eq('id', 1);
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return new Response(null, { status: 204 });
}
