import { requireStaff } from '@/lib/auth/requireStaff';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return Response.json({ error: '値が正しくありません' }, { status: 400 });
  }
  const { error } = await createServiceClient().rpc('admin_reorder_menu', { p_ids: ids });
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return new Response(null, { status: 204 });
}
