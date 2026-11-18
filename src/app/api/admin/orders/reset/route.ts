import { RESET_CONFIRM_WORD } from '@/lib/admin/validate';
import { requireStaff } from '@/lib/auth/requireStaff';
import { createServiceClient } from '@/lib/supabase/server';

/** Deletes every order, order line and the numbering. Menu, photos and settings stay. */
export async function POST(request: Request) {
  const denied = await requireStaff(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== RESET_CONFIRM_WORD) {
    return Response.json({ error: `確認のため「${RESET_CONFIRM_WORD}」と入力してください` }, { status: 400 });
  }

  const { error } = await createServiceClient().rpc('admin_reset_orders');
  if (error) return Response.json({ error: 'server_error' }, { status: 500 });
  return new Response(null, { status: 204 });
}
